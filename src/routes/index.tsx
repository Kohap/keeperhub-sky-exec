import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Landing });

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
    hint: "That exact workflow. Run id + explorer hash on Ethereum.",
  },
] as const;

function Landing() {
  return (
    <main className="rise-in mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <p className="font-mono text-2xs tracking-kicker text-accent uppercase">
          KeeperHub · Sky Protocol
        </p>
        <nav className="flex flex-wrap items-center gap-3 font-mono text-2xs">
          <Link to="/desk" className="text-muted hover:text-accent">
            Desk
          </Link>
          <a
            href="https://github.com/Kohap/keeperhub-sky-exec"
            target="_blank"
            rel="noreferrer"
            className="text-muted hover:text-accent"
          >
            GitHub
          </a>
          <a
            href={PROVEN_RUN.txUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted hover:text-accent"
          >
            Etherscan
          </a>
        </nav>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
        <div>
          <h1 className="font-display text-3xl leading-tight tracking-display text-fg">
            Sky Exec
          </h1>
          <p className="mt-4 max-w-xl text-base leading-normal text-muted">
            A Claude/MCP agent composes a Sky sUSDS deposit or withdraw
            workflow on KeeperHub. I review it, dry-run with no chain write,
            then that exact workflow executes.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-snug text-subtle">
            Sky is the live savings market. KeeperHub is the execution layer.
            This app is the agent, policy, dry-run, and audit glue — not a
            fake protocol.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/desk"
              className={cn(buttonVariants({ variant: "primary" }))}
            >
              <span className="relative z-10">Open the desk</span>
            </Link>
            <a
              href={PROVEN_RUN.executionUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                KeeperHub run
                <ArrowUpRight className="size-3" aria-hidden />
              </span>
            </a>
          </div>
        </div>

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
          <div className="mt-1.5">
            <CopyHash value={PROVEN_RUN.txHash} />
          </div>
          <p className="mt-2 text-xs leading-snug text-muted">
            Sky approve 0 USDS for sUSDS vault · {PROVEN_RUN.network}. Gas
            sponsored. Not a deposit. Not a mock.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-xs">
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
          </div>
        </aside>
      </section>

      <ol className="overflow-hidden rounded-lg bg-surface shadow-border">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="flex items-baseline gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
          >
            <span className="w-5 shrink-0 font-mono text-2xs tabular-nums text-subtle">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{s.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">{s.hint}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface p-3 shadow-border">
          <h2 className="font-mono text-2xs font-medium tracking-wide uppercase">
            Policy
          </h2>
          <p className="mt-2 font-mono text-xs leading-snug text-muted">
            Cap 10 USDS · USDS/sUSDS · chain 1 · cooldown 30s · kill switch
          </p>
          <p className="mt-2 text-sm leading-snug text-fg">
            Failure path: deposit 100 USDS → reject. Dry-run and Execute never
            run.
          </p>
        </div>
        <div className="rounded-lg bg-surface p-3 shadow-border">
          <h2 className="font-mono text-2xs font-medium tracking-wide uppercase">
            90 seconds
          </h2>
          <p className="mt-2 text-sm leading-snug text-fg">
            Open the desk. Success path → Policy check → Dry-run → Execute →
            Last run · recorded.
          </p>
          <Link
            to="/desk"
            className="mt-3 inline-flex min-h-8 items-center font-mono text-xs text-accent hover:text-fg"
          >
            Go to the desk
            <ArrowUpRight className="ml-1 size-3" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border pt-4 font-mono text-2xs text-subtle">
        DoraHacks · KeeperHub — The Agent Economy · Ethereum mainnet
      </footer>
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
      {copied ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
      {copied ? "Copied" : "Copy hash"}
    </Button>
  );
}
