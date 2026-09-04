import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import {
  PROVEN_RUN,
  RECORDED_DRY_RUN,
} from "../../packages/keeperhub/src/proof.ts";
import { SiteFooter, SiteFrame, SiteNav } from "@/components/site-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Landing });

const VAULT = "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD";

const STEPS = [
  {
    n: "01",
    label: "Compose",
    hint: "Agent or CLI writes a Sky sUSDS workflow on KeeperHub MCP.",
  },
  {
    n: "02",
    label: "Policy check",
    hint: "Cap 10 USDS, allowlist, cooldown, kill switch. Reject never hits chain.",
  },
  {
    n: "03",
    label: "Dry-run",
    hint: "contract-call simulate. wouldRevert false. No funds move.",
  },
  {
    n: "04",
    label: "Execute",
    hint: "That exact workflow. Run id plus explorer hash on Ethereum.",
  },
] as const;

const FACTS = [
  { k: "Action", v: PROVEN_RUN.action },
  { k: "Gas", v: RECORDED_DRY_RUN.gasEstimate },
  { k: "wouldRevert", v: String(RECORDED_DRY_RUN.wouldRevert) },
  { k: "Block", v: String(PROVEN_RUN.blockNumber) },
] as const;

const MCP = [
  "composeIntent",
  "validate_workflow",
  "contract-call simulate",
  "execute_workflow",
  "get_execution",
] as const;

function Landing() {
  return (
    <SiteFrame cube>
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-3 sm:px-6 sm:py-4">
        <SiteNav />

        <div className="flex flex-col gap-5 py-8 sm:gap-6 sm:py-10">
          <ExecuteStub />
          <div className="max-w-xl">
            <h1 className="font-display text-2xl leading-tight tracking-display sm:text-3xl">
              The recorded Sky approve on KeeperHub.
            </h1>
            <p className="mt-2 text-sm leading-normal text-muted sm:text-base">
              A Claude/MCP agent composes a Sky sUSDS workflow. You gate it,
              dry-run with no chain write, then that exact graph executes.
            </p>
            <div className="mt-4">
              <Link
                to="/desk"
                className={cn(
                  buttonVariants({ variant: "primary" }),
                  "w-full sm:w-auto",
                )}
              >
                <span className="relative z-10">Open the desk</span>
              </Link>
            </div>
          </div>
          <dl className="grid max-w-3xl grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-6">
            {FACTS.map((f) => (
              <div key={f.k} className="min-w-0">
                <dt className="text-xs text-subtle">{f.k}</dt>
                <dd className="mt-0.5 break-all font-mono text-sm tabular-nums">
                  {f.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ol>
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-t border-border py-4"
            >
              <span className="font-display text-lg leading-none text-accent">
                {s.n}
              </span>
              <div>
                <p className="text-base font-medium leading-tight">{s.label}</p>
                <p className="mt-1 text-sm leading-snug text-muted">{s.hint}</p>
              </div>
            </li>
          ))}
        </ol>

        <RejectStub />

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-subtle">KeeperHub MCP on this run</p>
          <ul className="mt-3 flex flex-col gap-2 font-mono text-sm sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {MCP.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <p className="mt-10 max-w-xl text-sm leading-normal text-muted">
          Policy is cap 10 USDS, USDS and sUSDS only, Ethereum, 30s cooldown,
          kill switch. Failure path: deposit 100 USDS is rejected. Dry-run and
          Execute never run. Ninety seconds on the desk: Success path, Policy
          check, Dry-run, Execute, Last run recorded.
        </p>

        <SiteFooter />
      </div>
    </SiteFrame>
  );
}

function ExecuteStub() {
  return (
    <div className="relative max-w-3xl overflow-x-clip">
      <article className="kh-stub bg-surface-2 py-4 pr-5 pl-10 sm:py-5 sm:pr-10 sm:pl-10">
        <p className="text-sm text-muted">
          Sky approve 0 USDS for sUSDS vault · {PROVEN_RUN.network} · block{" "}
          {PROVEN_RUN.blockNumber}
        </p>
        <a
          href={PROVEN_RUN.txUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all font-mono text-sm leading-snug text-fg tabular-nums hover:text-accent sm:text-xl"
        >
          {PROVEN_RUN.txHash}
        </a>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <CopyHash value={PROVEN_RUN.txHash} />
          <a
            href={PROVEN_RUN.executionUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-accent"
          >
            run {PROVEN_RUN.executionId}
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        </div>
        <p className="mt-3 break-all text-xs leading-snug text-subtle">
          spender {VAULT} · gas sponsored · not a deposit · not a mock
        </p>
      </article>
    </div>
  );
}

function RejectStub() {
  return (
    <article className="mt-10 max-w-3xl border-t border-border pt-6">
      <p className="text-xs text-subtle">Failure path. No chain write.</p>
      <p className="mt-2 font-display text-xl tracking-display">
        Policy reject · deposit 100 USDS
      </p>
      <p className="mt-2 max-w-xl text-sm leading-normal text-muted">
        Cap is 10 USDS. Compose still runs. Policy check returns reject.
        Dry-run and Execute never run. That is the kill judges should see.
      </p>
    </article>
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
      {copied ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
      {copied ? "Copied" : "Copy hash"}
    </Button>
  );
}
