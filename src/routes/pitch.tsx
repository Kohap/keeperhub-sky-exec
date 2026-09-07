import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { SiteNav } from "@/components/site-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pitch")({ component: PitchPage });

const TX = PROVEN_RUN.txUrl;
const HASH = PROVEN_RUN.txHash;
const DESK = "https://keeperhub-sky-exec.vercel.app/desk";
const VIDEO = "https://youtu.be/_jNeXn85wI0";
const GH = "https://github.com/Kohap/keeperhub-sky-exec";
const VAULT = "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD";

const SLIDES = [
  {
    kicker: "01 / 09",
    title: "Sky × KeeperHub",
    lead: "Sky Exec · Main track · Best Integration into a Live Project",
    body: [
      "A Claude/MCP agent composes a Sky sUSDS workflow on KeeperHub.",
      "I review it, dry-run with no chain write, then that exact graph executes.",
      "Sky is the live savings market. KeeperHub is the execution layer. This repo is the glue.",
    ],
  },
  {
    kicker: "02 / 09 · Problem",
    title: "Agents rewrite the write",
    lead: "Sky sUSDS is mainnet. There is no testnet plugin.",
    body: [
      "An LLM can decide “deposit spare USDS.” At execution time it reinterprets the amount, the spender, or the chain.",
      "Sky already has users and a vault. A wrong write is real USDS, not a mock.",
      "The last mile is not another Sky UI. It is a deterministic graph the agent cannot mutate after you approve it.",
    ],
  },
  {
    kicker: "03 / 09 · Solution",
    title: "Compose, gate, simulate, then that graph",
    lead: "Nothing is inferred at execution time.",
    body: [
      "compose → policy → dry-run → KeeperHub execute → audit",
      "Policy hides the cap (10 USDS), allowlisted Sky actions, chain 1, cooldown, and a kill switch.",
      "Dry-run is REST contract-call simulate. Execute is MCP execute_workflow. Same workflow id both times.",
    ],
  },
  {
    kicker: "04 / 09 · How it works",
    title: "Five clicks a judge can follow",
    lead: "Labels on the desk: Policy check · Dry-run · Execute",
    body: [
      "1. Prompt: approve 0 USDS for the sUSDS vault → action sky/approve-usds.",
      "2. Policy check is local: kill switch, chain 1, Sky action, asset, cap 10, cooldown. Reject never hits chain.",
      "3. Dry-run: wouldRevert false, gas on the confirm strip. No funds move.",
      "4. Execute: MCP run r7grdajtci7hf757zd9xr. Fixture mode replays the recorded hash.",
      "5. Kill switch is the other failure path.",
    ],
  },
  {
    kicker: "05 / 09 · Product",
    title: "The desk, not a docs site",
    lead: "Fixture chip when the key is empty. Recorded rows are labeled recorded.",
    body: [
      "Landing shows the mined hash. Desk is the 90-second path.",
      "CLI: npm run compose — same policy, same adapters.",
      "Hosted MCP at app.keeperhub.com/mcp. Org key kh_ in session only. Empty key = fixture.",
    ],
  },
  {
    kicker: "06 / 09 · Technical",
    title: "Sky-specific glue, not a new protocol",
    lead: "packages/policy · packages/keeperhub · packages/audit · packages/cli",
    body: [
      "MCP: create_workflow, validate_workflow, execute_workflow, get_execution, list_action_schemas.",
      "Dry-run does not use POST /api/execute/sky/approve-usds — that path ignored simulate:true in our tests.",
      "Ethereum mainnet. Vault " +
        VAULT +
        ". Wallet " +
        PROVEN_RUN.wallet +
        ".",
    ],
  },
  {
    kicker: "07 / 09 · Live proof",
    title: "One hash, not a mock",
    lead: "sky/approve-usds · amount 0 · block " + PROVEN_RUN.blockNumber,
    body: [
      "Gas sponsored. Allowance set. Savings did not move. Say that on the form.",
      "Guest KeeperHub /executions/:id 404s. Etherscan is the public proof.",
      "Workflow mcwzez7idnh81xj8dofz1 is KeeperHub’s graph, not sky.money.",
    ],
  },
  {
    kicker: "08 / 09 · Live project",
    title: "Sky is on the other side",
    lead: "USDS ↔ sUSDS. Users already save there.",
    body: [
      "This integration is specific: Sky actions only, assets USDS and sUSDS, chain 1.",
      "KeeperHub is not the live project. This UI is not the live project.",
      "We would rather show one working Sky write than a second protocol.",
    ],
  },
  {
    kicker: "09 / 09 · Track",
    title: "Main — Best Integration into a Live Project",
    lead: "Sky is the live project. Not the bounty. Not a standalone demo.",
    body: [
      "Open the desk. Policy check, Dry-run, Execute, then Policy reject.",
      "Form: GitHub, video, Etherscan hash. Pack in docs/SUBMISSION.md.",
      "The live write is sky/approve-usds amount 0. Savings did not move.",
    ],
  },
] as const;

function PitchPage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = root.current;
      if (!el) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
      }
      if (e.key === "Home") {
        e.preventDefault();
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (e.key === "End") {
        e.preventDefault();
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={root}
      className="h-dvh snap-y snap-mandatory overflow-y-auto bg-bg text-fg"
    >
      {SLIDES.map((s, i) => (
        <section
          key={s.kicker}
          className="flex min-h-dvh snap-start flex-col px-4 py-4 sm:px-8 sm:py-6"
        >
          {i === 0 ? (
            <div className="mx-auto w-full max-w-3xl">
              <SiteNav />
            </div>
          ) : (
            <p className="mx-auto w-full max-w-3xl font-mono text-xs text-subtle">
              Sky Exec
            </p>
          )}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-8">
            <p className="font-mono text-xs text-muted">{s.kicker}</p>
            <h1 className="mt-3 max-w-xl font-display text-3xl tracking-display">
              {s.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted">{s.lead}</p>
            <ul className="mt-6 max-w-xl space-y-3 text-sm leading-normal text-fg">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {i === 0 || i === 6 || i === 8 ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {i === 0 || i === 8 ? (
                  <Link
                    to="/desk"
                    className={cn(buttonVariants({ variant: "primary" }), "w-full sm:w-auto")}
                  >
                    Open the desk
                  </Link>
                ) : null}
                {i === 6 || i === 8 ? (
                  <a
                    href={TX}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-mono text-xs text-muted tabular-nums hover:text-accent"
                  >
                    {HASH}
                  </a>
                ) : null}
                {i === 8 ? (
                  <>
                    <a
                      href={VIDEO}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-muted hover:text-accent"
                    >
                      Demo
                    </a>
                    <a
                      href={GH}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-muted hover:text-accent"
                    >
                      GitHub
                    </a>
                    <a href={DESK} className="text-sm text-muted hover:text-accent">
                      Desk
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <p className="mx-auto w-full max-w-3xl pb-2 font-mono text-2xs text-subtle">
            Arrow keys move slides · {i + 1} / {SLIDES.length}
          </p>
        </section>
      ))}
    </div>
  );
}
