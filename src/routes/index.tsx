import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { SiteFooter, SiteNav } from "@/components/site-shell";
import { SvStage } from "@/components/sv-stage";
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

function Landing() {
  return (
    <main className="overflow-x-clip">
      <section className="relative min-h-dvh overflow-hidden">
        <SvStage strength={12}>
          <div className="sv-orbit">
            <img
              src="/visuals/sv31.jpg"
              alt=""
              className="sv-plane sv-drift h-full w-full object-cover object-right"
            />
            <img
              src="/visuals/sv47.jpg"
              alt=""
              className="sv-card sv-float"
            />
          </div>
          <div className="sv-veil bg-gradient-to-r from-bg via-bg/80 to-bg/20 sm:via-bg/70" />
        </SvStage>
        <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-3 sm:px-6 sm:py-4">
        <SiteNav />

        <div className="flex flex-1 flex-col justify-center gap-4 py-4 sm:gap-5 sm:py-6">
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
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                <span className="relative z-10">Open the desk</span>
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
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

        <p className="mt-10 max-w-xl text-sm leading-normal text-muted">
          Policy is cap 10 USDS, USDS and sUSDS only, Ethereum, 30s cooldown,
          kill switch. Failure path: deposit 100 USDS is rejected. Dry-run and
          Execute never run.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-normal text-muted">
          Ninety seconds on the desk: Success path, Policy check, Dry-run,
          Execute, Last run recorded.
        </p>

        <SiteFooter />
      </section>
    </main>
  );
}

function ExecuteStub() {
  return (
    <div className="relative max-w-3xl overflow-x-clip">
      <article className="kh-stub bg-surface-2 py-4 pr-6 pl-8 sm:py-5 sm:pr-10 sm:pl-10">
        <p className="flex items-start gap-2 text-sm text-muted">
          <span>
            Sky approve 0 USDS for sUSDS vault · {PROVEN_RUN.network} · block{" "}
            {PROVEN_RUN.blockNumber}
          </span>
        </p>
        <a
          href={PROVEN_RUN.txUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all font-mono text-lg leading-snug text-fg tabular-nums hover:text-accent sm:text-xl"
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
