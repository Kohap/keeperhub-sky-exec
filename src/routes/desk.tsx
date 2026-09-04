import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  LoaderCircle,
  Shield,
  Skull,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuditRecord } from "../../packages/audit/src/types.ts";
import { stamp } from "../../packages/audit/src/memory.ts";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import {
  ALLOWED_ASSETS,
  loadLimitsFromEnv,
} from "../../packages/policy/src/index.ts";
import { Button } from "@/components/ui/button";
import { cn, shortHash } from "@/lib/utils";
import {
  composeAndGate,
  dryRunPipeline,
  executePipeline,
  listSkyActions,
  type PipelineOutput,
} from "@/lib/sky-pipeline";

export const Route = createFileRoute("/desk")({ component: Home });

const REJECT_PROMPT = "deposit spare USDS above 100 into sUSDS";
const SUCCESS_PROMPT = "approve 0 USDS for the sUSDS vault";
const AUDIT_KEY = "sky-exec-audit-v1";
const KEY_STORE = "sky-exec-kh-key";
const LAST_EXEC_KEY = "sky-exec-last-exec";

type SkyAction = { actionType: string; label: string; description?: string };

function stageMessage(
  busy: "compose" | "dry" | "exec" | null,
  last: PipelineOutput | null,
) {
  if (busy === "compose") return "Running policy check";
  if (busy === "dry") return "Running dry-run";
  if (busy === "exec") return "Running execute";
  if (!last) return "";
  if (last.error === "policy_reject" && last.policy.allow === false)
    return last.policy.reason;
  if (last.error === "dry_run_fail")
    return last.dryRun?.error ?? "Dry-run failed. Execute skipped.";
  if (last.run)
    return last.mode === "fixture"
      ? "Execute recorded. Not a new broadcast."
      : "Execute succeeded.";
  if (last.dryRun?.ok)
    return `Dry-run ok · gas ${last.dryRun.gasEstimate ?? "—"}`;
  if (last.policy.allow) return "Policy allow";
  return last.error ?? "";
}

type McpLine = {
  tool: string;
  detail: string;
  state: "idle" | "run" | "done" | "fail";
};

function mcpLines(
  busy: "compose" | "dry" | "exec" | null,
  last: PipelineOutput | null,
): McpLine[] {
  const lines: McpLine[] = [];
  if (busy === "compose" || last) {
    lines.push({
      tool: "composeIntent",
      detail: last?.intent
        ? `${last.intent.actionType} · ${last.intent.amountHuman} ${last.intent.asset}`
        : "MCP workflow from the prompt",
      state: last ? "done" : "run",
    });
    lines.push({
      tool: "assertAllowed",
      detail:
        last?.policy.allow === true
          ? "allow"
          : last?.policy.allow === false
            ? last.policy.reason
            : "cap · allowlist · cooldown · kill switch",
      state: last
        ? last.policy.allow
          ? "done"
          : "fail"
        : "run",
    });
  }
  if (busy === "dry" || last?.dryRun) {
    const d = last?.dryRun;
    lines.push({
      tool: "validate_workflow",
      detail: last?.workflowName ?? "Sky approve",
      state: d ? (d.ok ? "done" : "fail") : "run",
    });
    lines.push({
      tool: "contract-call simulate",
      detail: d
        ? `wouldRevert ${String(d.wouldRevert ?? !d.ok)} · gas ${d.gasEstimate ?? "—"}`
        : "no chain write",
      state: d ? (d.ok ? "done" : "fail") : "run",
    });
  }
  if (busy === "exec" || last?.run) {
    const r = last?.run;
    lines.push({
      tool: "execute_workflow",
      detail: r
        ? `${r.executionId}${last?.mode === "fixture" ? " · recorded" : ""}`
        : "KeeperHub execute_workflow",
      state: r ? (r.status === "success" ? "done" : "fail") : "run",
    });
    lines.push({
      tool: "get_execution",
      detail: r
        ? `${r.status}${r.txHash ? ` · ${shortHash(r.txHash)}` : ""}`
        : "KeeperHub get_execution",
      state: r ? (r.status === "success" ? "done" : "fail") : "run",
    });
  }
  return lines;
}

function loadAudit(): AuditRecord[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditRecord[]) : [];
  } catch {
    return [];
  }
}

function Home() {
  const [prompt, setPrompt] = useState(SUCCESS_PROMPT);
  const [apiKey, setApiKey] = useState("");
  const [killSwitch, setKillSwitch] = useState(false);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [last, setLast] = useState<PipelineOutput | null>(null);
  const [busy, setBusy] = useState<"compose" | "dry" | "exec" | null>(null);
  const [skyActions, setSkyActions] = useState<SkyAction[]>([]);
  const [skyError, setSkyError] = useState<string | null>(null);
  const [lastExecuteAtMs, setLastExecuteAtMs] = useState<number | undefined>();
  const lastRunRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setAudit(loadAudit());
    try {
      setApiKey(sessionStorage.getItem(KEY_STORE) ?? "");
      const raw = sessionStorage.getItem(LAST_EXEC_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n)) setLastExecuteAtMs(n);
      }
    } catch {
      /* ignore */
    }
    void listSkyActions()
      .then(setSkyActions)
      .catch((err: unknown) =>
        setSkyError(err instanceof Error ? err.message : "schema fetch failed"),
      );
  }, []);

  function persistAudit(row: AuditRecord) {
    setAudit((prev) => {
      const next = [row, ...prev].slice(0, 40);
      try {
        localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function clearKey() {
    setApiKey("");
    try {
      sessionStorage.removeItem(KEY_STORE);
    } catch {
      /* ignore */
    }
  }

  async function run(
    kind: "compose" | "dry" | "exec",
    fn: () => Promise<PipelineOutput>,
  ) {
    setBusy(kind);
    try {
      const out = await fn();
      setLast(out);
      persistAudit(
        stamp({
          intent: out.intent,
          policy: out.policy,
          dryRun: out.dryRun,
          runId: out.run?.executionId,
          txHash: out.run?.txHash,
          error: out.error,
          mode: out.mode,
        }),
      );
      if (kind === "exec" && out.run) {
        const at = Date.now();
        setLastExecuteAtMs(at);
        try {
          sessionStorage.setItem(LAST_EXEC_KEY, String(at));
        } catch {
          /* ignore */
        }
        queueMicrotask(() => lastRunRef.current?.focus());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "request failed";
      setLast((prev) => (prev ? { ...prev, error: message } : null));
    } finally {
      setBusy(null);
    }
  }

  const policyBlocked =
    last?.policy.allow === false && last.intent.prompt === prompt;
  const payload = { data: { prompt, apiKey, killSwitch, lastExecuteAtMs } };
  const hasLiveKey = apiKey.trim().startsWith("kh_");
  const fixtureBanner = !hasLiveKey || last?.mode === "fixture";
  const fixtureChip = last ? last.mode === "fixture" : !hasLiveKey;
  const liveMessage = stageMessage(busy, last);
  const limits = loadLimitsFromEnv(undefined, { killSwitch, lastExecuteAtMs });
  const cooldownLeft =
    lastExecuteAtMs && limits.cooldownSeconds > 0
      ? Math.max(
          0,
          limits.cooldownSeconds -
            Math.floor((Date.now() - lastExecuteAtMs) / 1000),
        )
      : 0;
  const log = mcpLines(busy, last);

  const steps = useMemo(() => {
    const p = last?.policy;
    const d = last?.dryRun;
    const r = last?.run;
    return [
      {
        id: "compose",
        label: "Compose",
        hint: last?.intent.actionType ?? "MCP workflow from the prompt",
        state: last ? "done" : "idle",
      },
      {
        id: "policy",
        label: "Policy",
        hint: p
          ? p.allow
            ? "Allow"
            : p.reason
          : "Cap, allowlist, cooldown, kill switch",
        state: !p ? "idle" : p.allow ? "done" : "fail",
      },
      {
        id: "dry",
        label: "Dry-run",
        hint: d
          ? d.ok
            ? `simulate · gas ${d.gasEstimate ?? "—"}`
            : (d.error ?? "would revert")
          : "No chain write",
        state: !d ? "idle" : d.ok ? "done" : "fail",
      },
      {
        id: "exec",
        label: "Execute",
        hint: r
          ? `${r.status} · ${r.txHash ? shortHash(r.txHash) : r.executionId}`
          : "KeeperHub execute_workflow",
        state: !r ? "idle" : r.status === "success" ? "done" : "fail",
      },
    ] as const;
  }, [last]);

  return (
    <main className="rise-in mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-2xs tracking-kicker text-accent uppercase">
            KeeperHub · Sky Protocol
          </p>
          <h1 className="mt-1 font-display text-2xl leading-tight tracking-display text-fg">
            <Link to="/" className="hover:text-accent">
              Sky Exec
            </Link>
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-snug text-muted">
            Recorded action: Sky approve 0 USDS for the sUSDS vault on Ethereum
            via KeeperHub. Not a completed deposit. You review it, dry-run with
            no chain write, then that exact workflow executes.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusChip
            ok={!fixtureChip}
            label={fixtureChip ? "fixture" : "live MCP"}
          />
          <StatusChip
            ok={skyActions.length > 0}
            label={
              skyError
                ? "Sky schema error"
                : skyActions.length
                  ? `${skyActions.length} Sky actions live`
                  : "Listing Sky actions"
            }
          />
          <StatusChip ok label="Ethereum mainnet" />
        </div>
      </header>

      <p className="font-mono text-2xs leading-snug text-muted">
        Policy · cap {limits.maxAmountHuman} USDS · {ALLOWED_ASSETS.join("/")} ·
        chain {limits.chainId} · cooldown {limits.cooldownSeconds}s
        {killSwitch ? " · KILL_SWITCH" : ""}
        {cooldownLeft > 0 ? ` · cooling ${cooldownLeft}s` : ""}
      </p>

      {fixtureBanner ? (
        <div
          role="status"
          className="motion-enter rounded-md bg-surface-2 px-3 py-2 text-xs leading-snug text-fg shadow-border"
        >
          Fixture mode. Empty key — hashes here are the recorded KeeperHub
          execute, not a new broadcast.
        </div>
      ) : null}

      <ProvenRun />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div
          className="surface-hover rounded-lg bg-surface p-3 shadow-border"
          aria-busy={busy !== null}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-mono text-2xs font-medium tracking-wide uppercase">
              Compose
            </h2>
            <label
              className={cn(
                "flex min-h-8 items-center gap-2 rounded-md px-2 font-mono text-2xs transition-colors duration-(--motion-fast) ease-(--ease-out) focus-within:ring-2 focus-within:ring-ring",
                killSwitch ? "bg-danger/10 text-danger" : "text-muted",
              )}
            >
              <input
                type="checkbox"
                checked={killSwitch}
                onChange={(e) => setKillSwitch(e.target.checked)}
                className="size-4 accent-accent"
              />
              KILL_SWITCH
            </label>
          </div>
          <label
            htmlFor="workflow-prompt"
            className="sr-only"
          >
            Workflow prompt
          </label>
          <textarea
            id="workflow-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-md bg-bg px-3 py-2 font-mono text-sm text-fg shadow-border outline-none ring-ring transition-[box-shadow] duration-(--motion-quick) ease-(--ease-out) focus:ring-2"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              type="button"
              aria-pressed={prompt === SUCCESS_PROMPT}
              onClick={() => setPrompt(SUCCESS_PROMPT)}
            >
              Success path
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              aria-pressed={prompt === REJECT_PROMPT}
              onClick={() => setPrompt(REJECT_PROMPT)}
            >
              Policy reject
            </Button>
          </div>
          <div className="mt-3">
            <label
              htmlFor="kh-org-key"
              className="mb-1 block font-mono text-2xs tracking-wide text-muted uppercase"
            >
              KeeperHub org key (optional)
            </label>
            <div className="flex flex-col gap-1.5 sm:flex-row">
              <input
                id="kh-org-key"
                type="password"
                autoComplete="off"
                placeholder="kh_…"
                value={apiKey}
                onChange={(e) => {
                  const v = e.target.value;
                  setApiKey(v);
                  try {
                    sessionStorage.setItem(KEY_STORE, v);
                  } catch {
                    /* ignore */
                  }
                }}
                className="h-11 w-full rounded-md bg-bg px-3 font-mono text-sm text-fg shadow-border outline-none ring-ring transition-[box-shadow] duration-(--motion-quick) ease-(--ease-out) focus:ring-2"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-11 shrink-0"
                onClick={clearKey}
              >
                Clear key
              </Button>
            </div>
            <span className="mt-1 block text-xs text-subtle">
              Stays in this browser session. Empty = fixture mode, which replays
              the recorded live hash and will not invent a new one.
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row">
            <Button
              className="flex-1"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => run("compose", () => composeAndGate(payload))}
            >
              {busy === "compose" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Shield className="size-4" aria-hidden />
              )}
              Policy check
            </Button>
            <Button
              className="flex-1"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => run("dry", () => dryRunPipeline(payload))}
            >
              {busy === "dry" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              Dry-run
            </Button>
            <Button
              className="flex-1"
              disabled={busy !== null || policyBlocked}
              onClick={() => run("exec", () => executePipeline(payload))}
            >
              {busy === "exec" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              Execute
            </Button>
          </div>
          {last?.dryRun ? (
            <p
              className={cn(
                "mt-2 rounded-md px-3 py-2 font-mono text-2xs leading-snug shadow-border",
                last.dryRun.ok ? "text-ok" : "text-danger",
              )}
            >
              Dry-run {last.dryRun.ok ? "ok" : "fail"} · wouldRevert{" "}
              {String(last.dryRun.wouldRevert ?? !last.dryRun.ok)} · gas{" "}
              {last.dryRun.gasEstimate ?? "—"} · no chain write
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-snug text-muted">
            Confirm Execute: this calls KeeperHub{" "}
            <span className="font-mono">execute_workflow</span> on the composed
            Sky approve. Dry-run first. Fixture replays the recorded hash — it
            is not a new broadcast.
          </p>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 min-h-5 text-xs text-muted transition-opacity duration-(--motion-micro) ease-(--ease-out)"
          >
            {liveMessage}
          </p>
          {last?.error === "policy_reject" && last.policy.allow === false ? (
            <p className="mt-4 motion-enter flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-fg shadow-border">
              <Skull className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              {last.policy.reason}
            </p>
          ) : null}
          {last?.error === "dry_run_fail" ? (
            <p className="mt-4 motion-enter flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-fg shadow-border">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              {last.dryRun?.error ?? "Dry-run failed. Execute skipped."}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
        <ol className="overflow-hidden rounded-lg bg-surface shadow-border">
          {steps.map((s, i) => (
            <li
              key={s.id}
              aria-current={
                (busy === "compose" &&
                  (s.id === "compose" || s.id === "policy")) ||
                (busy === "dry" && s.id === "dry") ||
                (busy === "exec" && s.id === "exec")
                  ? "step"
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0",
                ((busy === "compose" &&
                  (s.id === "compose" || s.id === "policy")) ||
                  (busy === "dry" && s.id === "dry") ||
                  (busy === "exec" && s.id === "exec")) &&
                  "bg-surface-2",
              )}
            >
              <p className="w-5 shrink-0 font-mono text-2xs tabular-nums text-subtle">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{s.label}</p>
                <p className="truncate font-mono text-2xs leading-snug text-muted">
                  {s.hint}
                </p>
              </div>
              <StepMark state={s.state} />
            </li>
          ))}
        </ol>
        <section className="rounded-lg bg-surface p-3 shadow-border">
          <h2 className="mb-1 font-mono text-2xs font-medium tracking-wide uppercase">
            MCP log
          </h2>
          {log.length === 0 ? (
            <p className="text-xs text-muted">
              Empty. Run a policy check, dry-run, or execute.
            </p>
          ) : (
            <ol>
              {log.map((line) => (
                <li
                  key={line.tool}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0"
                >
                  <span className="font-mono text-2xs text-accent">
                    {line.tool}
                  </span>
                  <span className="min-w-0 truncate text-right font-mono text-2xs text-muted">
                    {line.detail}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        </div>
      </section>

      {last?.run ? (
        <section className="motion-enter rounded-lg bg-surface p-3 shadow-border">
          <h2
            ref={lastRunRef}
            tabIndex={-1}
            className="font-mono text-2xs font-medium tracking-wide uppercase outline-none"
          >
            {last.mode === "fixture" ? "Last run · recorded" : "Last run"}
          </h2>
          {last.mode === "fixture" ? (
            <p className="mt-1 text-xs leading-snug text-muted">
              Recorded KeeperHub hash. Not a new broadcast.
            </p>
          ) : null}
          {last.run.txHash ? (
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <a
                href={last.run.txLink}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 break-all font-mono text-lg leading-snug text-fg tabular-nums hover:text-accent"
              >
                {last.run.txHash}
              </a>
              <CopyHash value={last.run.txHash} />
            </div>
          ) : null}
          <dl className="mt-2 divide-y divide-border">
            <Fact
              label="Execution"
              value={last.run.executionId}
              href={`https://app.keeperhub.com/executions/${last.run.executionId}`}
            />
            <Fact
              label="Tx"
              value={last.run.txHash ?? "—"}
              href={last.run.txLink}
              recorded={last.mode === "fixture"}
            />
            <Fact label="Status" value={last.run.status} />
            <Fact
              label="Mode"
              value={
                last.mode === "fixture" ? "fixture · recorded" : "live MCP"
              }
            />
          </dl>
        </section>
      ) : null}

      <section className="rounded-lg bg-surface p-3 shadow-border">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-mono text-2xs font-medium tracking-wide uppercase">
            Audit trail
          </h2>
          <span className="font-mono text-2xs tabular-nums text-subtle">
            {audit.length} rows · local
          </span>
        </div>
        {audit.length === 0 ? (
          <p className="text-sm leading-normal text-muted">
            Empty. Run a policy check, dry-run, or execute.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-left text-sm">
              <thead className="font-mono text-2xs tracking-wide text-subtle uppercase">
                <tr className="border-b border-border">
                  <th className="py-1.5 pr-3 font-medium">Time</th>
                  <th className="py-1.5 pr-3 font-medium">Intent</th>
                  <th className="py-1.5 pr-3 font-medium">Policy</th>
                  <th className="py-1.5 pr-3 font-medium">Run</th>
                  <th className="py-1.5 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row, i) => (
                  <tr
                    key={`${row.timestamp}-${i}`}
                    className="border-b border-border/70"
                  >
                    <td className="py-1.5 pr-3 whitespace-nowrap font-mono text-xs tabular-nums text-muted">
                      {row.timestamp.slice(11, 19)}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">
                      {row.intent.actionType} · {row.intent.amountHuman}
                    </td>
                    <td className="py-1.5 pr-3 text-xs">
                      {row.policy.allow ? (
                        <span className="text-ok">allow</span>
                      ) : (
                        <span className="text-danger">
                          reject
                          {!row.policy.allow ? ` · ${row.policy.reason}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs tabular-nums">
                      {row.runId ? shortHash(row.runId, 4) : "—"}
                      {row.mode === "fixture" && row.runId ? (
                        <span className="ml-2 text-subtle">recorded</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 font-mono text-xs tabular-nums">
                      {row.txHash ? (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <a
                            className="group inline-flex items-center gap-1 text-accent hover:underline"
                            href={`https://etherscan.io/tx/${row.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortHash(row.txHash)}
                            <ArrowUpRight className="size-3 transition-transform duration-(--motion-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </a>
                          {row.mode === "fixture" ? (
                            <span className="text-subtle">recorded</span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-mono text-2xs font-medium tracking-wide uppercase">
          Sky actions from KeeperHub
        </h2>
        <ul className="overflow-hidden rounded-lg bg-surface shadow-border">
          {skyActions.slice(0, 12).map((a) => (
            <li
              key={a.actionType}
              className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-1.5 last:border-b-0"
            >
              <p className="font-mono text-xs text-accent">{a.actionType}</p>
              <p className="truncate text-xs text-muted">{a.label}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function CopyHash({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="shrink-0"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {copied ? "Copied" : "Copy hash"}
    </Button>
  );
}

function ProvenRun() {
  return (
    <aside className="rounded-lg bg-surface-2 p-3 shadow-border">
      <p className="font-mono text-2xs tracking-kicker text-accent uppercase">
        Recorded KeeperHub execute
      </p>
      <a
        href={PROVEN_RUN.txUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 block break-all font-mono text-lg leading-snug text-fg tabular-nums hover:text-accent"
      >
        {PROVEN_RUN.txHash}
      </a>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <CopyHash value={PROVEN_RUN.txHash} />
      </div>
      <p className="mt-1.5 text-xs leading-snug text-muted">
        Sky approve 0 USDS for sUSDS vault · {PROVEN_RUN.network}. Gas
        sponsored. Not a deposit. Not a mock.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 font-mono text-xs">
        <a
          className="group inline-flex min-h-8 items-center gap-1 text-muted hover:text-accent"
          href={PROVEN_RUN.executionUrl}
          target="_blank"
          rel="noreferrer"
        >
          run {PROVEN_RUN.executionId}
          <ArrowUpRight className="size-3 transition-transform duration-(--motion-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <a
          className="group inline-flex min-h-8 items-center gap-1 text-muted hover:text-accent"
          href={PROVEN_RUN.txUrl}
          target="_blank"
          rel="noreferrer"
        >
          Etherscan
          <ArrowUpRight className="size-3 transition-transform duration-(--motion-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <a
          className="group inline-flex min-h-8 items-center gap-1 text-muted hover:text-accent"
          href={PROVEN_RUN.approveWorkflowUrl}
          target="_blank"
          rel="noreferrer"
        >
          workflow {PROVEN_RUN.approveWorkflowId}
          <ArrowUpRight className="size-3 transition-transform duration-(--motion-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </aside>
  );
}

function Fact({
  label,
  value,
  href,
  recorded,
}: {
  label: string;
  value: string;
  href?: string;
  recorded?: boolean;
}) {
  const inner = (
    <span className="break-all font-mono text-xs tabular-nums text-fg">
      {value}
    </span>
  );
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 font-mono text-2xs tracking-wide text-subtle uppercase">
        {label}
        {recorded ? " · recorded" : ""}
      </dt>
      <dd className="min-w-0 text-right">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1 hover:text-accent"
          >
            {inner}
            <ArrowUpRight className="size-3 transition-transform duration-(--motion-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ) : (
          inner
        )}
      </dd>
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 font-mono text-2xs shadow-border transition-colors duration-(--motion-fast) ease-(--ease-out)",
        ok ? "text-ok" : "text-muted",
      )}
    >
      {label}
    </span>
  );
}

function StepMark({ state }: { state: "idle" | "done" | "fail" }) {
  if (state === "done") {
    return <Check className="size-4 text-ok" aria-label="done" />;
  }
  if (state === "fail") {
    return <CircleAlert className="size-4 text-danger" aria-label="failed" />;
  }
  return <span className="size-2 rounded-full bg-subtle/50" aria-hidden />;
}
