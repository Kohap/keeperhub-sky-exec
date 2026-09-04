import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  LoaderCircle,
  Shield,
  Skull,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuditRecord } from "../../packages/audit/src/types.ts";
import { stamp } from "../../packages/audit/src/memory.ts";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { Button } from "@/components/ui/button";
import { cn, shortHash } from "@/lib/utils";
import {
  composeAndGate,
  dryRunPipeline,
  executePipeline,
  listSkyActions,
  type PipelineOutput,
} from "@/lib/sky-pipeline";

export const Route = createFileRoute("/")({ component: Home });

const REJECT_PROMPT = "deposit spare USDS above 100 into sUSDS";
const SUCCESS_PROMPT = "approve 0 USDS for the sUSDS vault";
const AUDIT_KEY = "sky-exec-audit-v1";
const KEY_STORE = "sky-exec-kh-key";

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
  const lastRunRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setAudit(loadAudit());
    try {
      setApiKey(sessionStorage.getItem(KEY_STORE) ?? "");
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
  const payload = { data: { prompt, apiKey, killSwitch } };
  const hasLiveKey = apiKey.trim().startsWith("kh_");
  const fixtureBanner = !hasLiveKey || last?.mode === "fixture";
  const fixtureChip = last ? last.mode === "fixture" : !hasLiveKey;
  const liveMessage = stageMessage(busy, last);

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
    <main className="rise-in mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-5 pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-2xs tracking-kicker text-accent uppercase">
            KeeperHub · Sky Protocol
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight tracking-display text-fg">
            Sky Exec
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-normal text-muted">
            Recorded action: Sky approve 0 USDS for the sUSDS vault on Ethereum
            via KeeperHub. Not a completed deposit. You review it, dry-run with
            no chain write, then that exact workflow executes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {fixtureBanner ? (
        <div
          role="status"
          className="rounded-lg bg-surface-2 px-4 py-3 text-sm leading-normal text-fg shadow-border"
        >
          Fixture mode. Empty key — hashes here are the recorded KeeperHub
          execute, not a new broadcast.
        </div>
      ) : null}

      <ProvenRun />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div
          className="rounded-xl bg-surface p-4 shadow-border"
          aria-busy={busy !== null}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              Compose
            </h2>
            <label
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md px-2 font-mono text-2xs focus-within:ring-2 focus-within:ring-ring",
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
            rows={3}
            className="w-full resize-y rounded-md bg-bg px-3 py-3 font-mono text-sm text-fg shadow-border outline-none ring-ring focus:ring-2"
          />
          <div className="mt-3 flex flex-wrap gap-2">
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
          <div className="mt-4">
            <label
              htmlFor="kh-org-key"
              className="mb-1 block font-mono text-2xs tracking-wide text-muted uppercase"
            >
              KeeperHub org key (optional)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="h-11 w-full rounded-md bg-bg px-3 font-mono text-sm text-fg shadow-border outline-none ring-ring focus:ring-2"
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
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
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
          <p className="mt-3 text-xs leading-normal text-muted">
            Confirm Execute: this calls KeeperHub{" "}
            <span className="font-mono">execute_workflow</span> on the composed
            Sky approve. Dry-run first. Fixture replays the recorded hash — it
            is not a new broadcast.
          </p>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 min-h-5 text-xs text-muted"
          >
            {liveMessage}
          </p>
          {last?.error === "policy_reject" && last.policy.allow === false ? (
            <p className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-fg shadow-border">
              <Skull className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              {last.policy.reason}
            </p>
          ) : null}
          {last?.error === "dry_run_fail" ? (
            <p className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-fg shadow-border">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              {last.dryRun?.error ?? "Dry-run failed. Execute skipped."}
            </p>
          ) : null}
        </div>

        <ol className="flex flex-col gap-3">
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
                "rounded-lg bg-surface px-4 py-4 shadow-border",
                ((busy === "compose" &&
                  (s.id === "compose" || s.id === "policy")) ||
                  (busy === "dry" && s.id === "dry") ||
                  (busy === "exec" && s.id === "exec")) &&
                  "ring-2 ring-ring",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-2xs tabular-nums text-subtle">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <StepMark state={s.state} />
              </div>
              <p className="mt-1 text-base font-medium">{s.label}</p>
              <p className="mt-1 break-words font-mono text-xs leading-normal text-muted">
                {s.hint}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {last?.run ? (
        <section className="rounded-xl bg-surface p-4 shadow-border">
          <h2
            ref={lastRunRef}
            tabIndex={-1}
            className="text-sm font-medium tracking-wide uppercase outline-none"
          >
            {last.mode === "fixture" ? "Last run · recorded" : "Last run"}
          </h2>
          {last.mode === "fixture" ? (
            <p className="mt-2 text-sm leading-normal text-muted">
              Recorded KeeperHub hash. Not a new broadcast.
            </p>
          ) : null}
          {last.run.txHash ? (
            <a
              href={last.run.txLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block break-all font-mono text-xl leading-snug text-fg tabular-nums hover:text-accent"
            >
              {last.run.txHash}
            </a>
          ) : null}
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
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

      <section className="rounded-xl bg-surface p-4 shadow-border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide uppercase">
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
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Intent</th>
                  <th className="py-2 pr-3 font-medium">Policy</th>
                  <th className="py-2 pr-3 font-medium">Run</th>
                  <th className="py-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row, i) => (
                  <tr
                    key={`${row.timestamp}-${i}`}
                    className="border-b border-border/70"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs tabular-nums text-muted">
                      {row.timestamp.slice(11, 19)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {row.intent.actionType} · {row.intent.amountHuman}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {row.policy.allow ? (
                        <span className="text-ok">allow</span>
                      ) : (
                        <span className="text-danger">
                          reject
                          {!row.policy.allow ? ` · ${row.policy.reason}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs tabular-nums">
                      {row.runId ? shortHash(row.runId, 4) : "—"}
                      {row.mode === "fixture" && row.runId ? (
                        <span className="ml-2 text-subtle">recorded</span>
                      ) : null}
                    </td>
                    <td className="py-2 font-mono text-xs tabular-nums">
                      {row.txHash ? (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <a
                            className="inline-flex items-center gap-1 text-accent hover:underline"
                            href={`https://etherscan.io/tx/${row.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortHash(row.txHash)}
                            <ArrowUpRight className="size-3" />
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
        <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">
          Sky actions from KeeperHub
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {skyActions.slice(0, 12).map((a) => (
            <li
              key={a.actionType}
              className="rounded-md bg-surface px-3 py-3 shadow-border"
            >
              <p className="font-mono text-xs text-accent">{a.actionType}</p>
              <p className="mt-1 text-sm">{a.label}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ProvenRun() {
  return (
    <aside className="rounded-xl bg-surface-2 p-4 shadow-border sm:p-5">
      <p className="font-mono text-2xs tracking-kicker text-accent uppercase">
        Recorded KeeperHub execute
      </p>
      <a
        href={PROVEN_RUN.txUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block break-all font-mono text-xl leading-snug text-fg tabular-nums hover:text-accent"
      >
        {PROVEN_RUN.txHash}
      </a>
      <p className="mt-2 text-sm leading-normal text-muted">
        Sky approve 0 USDS for sUSDS vault · {PROVEN_RUN.network}. Gas
        sponsored. Not a deposit. Not a mock.
      </p>
      <div className="mt-3 flex flex-col gap-1 font-mono text-xs sm:flex-row sm:flex-wrap sm:gap-x-6">
        <a
          className="inline-flex min-h-11 items-center gap-1 text-muted hover:text-accent"
          href={PROVEN_RUN.executionUrl}
          target="_blank"
          rel="noreferrer"
        >
          run {PROVEN_RUN.executionId}
          <ArrowUpRight className="size-3" />
        </a>
        <a
          className="inline-flex min-h-11 items-center gap-1 text-muted hover:text-accent"
          href={PROVEN_RUN.txUrl}
          target="_blank"
          rel="noreferrer"
        >
          Etherscan
          <ArrowUpRight className="size-3" />
        </a>
        <a
          className="inline-flex min-h-11 items-center gap-1 text-muted hover:text-accent"
          href={PROVEN_RUN.approveWorkflowUrl}
          target="_blank"
          rel="noreferrer"
        >
          workflow {PROVEN_RUN.approveWorkflowId}
          <ArrowUpRight className="size-3" />
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
    <div>
      <dt className="font-mono text-2xs tracking-wide text-subtle uppercase">
        {label}
        {recorded ? " · recorded" : ""}
      </dt>
      <dd className="mt-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent"
          >
            {inner}
            <ArrowUpRight className="size-3" />
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
        "inline-flex h-8 items-center rounded-full px-3 font-mono text-2xs shadow-border",
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
