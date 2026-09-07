import { Link, createFileRoute } from "@tanstack/react-router";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { SiteFooter, SiteFrame, SiteNav, PageHero } from "@/components/site-shell";

export const Route = createFileRoute("/docs")({ component: DocsPage });

const USDS = "0xdC035D45d973E3EC169d2276DDab16f1e407384F";
const VAULT = "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD";

const TOC = [
  ["layers", "Three layers"],
  ["input", "Input"],
  ["compose", "Compose"],
  ["policy", "Policy"],
  ["dry", "Dry-run"],
  ["exec", "Execute"],
  ["fixture", "Fixture vs live"],
  ["fail", "Failure paths"],
] as const;

function DocsPage() {
  return (
    <SiteFrame>
      <div className="mx-auto min-h-dvh max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
        <SiteNav />
        <PageHero title="Mechanism" proof>
          <p className="mt-2 max-w-xl text-sm text-muted">
            The pipeline behind Policy check, Dry-run, and Execute. This is
            not the demo. The demo is the desk.
          </p>
        </PageHero>

        <nav className="mt-8 flex max-w-2xl flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-muted">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="hover:text-accent">
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-10 max-w-2xl space-y-12 text-sm leading-normal text-muted">
          <section>
            <p className="font-mono text-xs text-subtle">pipeline</p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs text-fg">
{`prompt
  → sanitize + Zod
  → composeIntent
  → assertAllowed
  → workflowFromIntent
  → dryRun (validate + simulate)
  → execute_workflow
  → audit`}
            </pre>
            <p className="mt-3">
              Same path in{" "}
              <code className="font-mono text-fg">runPipeline</code>, the
              desk, and{" "}
              <code className="font-mono text-fg">npm run compose</code>.
            </p>
          </section>

          <section id="layers" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Three layers</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-fg">Sky</span> is the live savings
                market. USDS{" "}
                <span className="break-all font-mono text-xs text-fg">{USDS}</span>
                . Vault{" "}
                <span className="break-all font-mono text-xs text-fg">{VAULT}</span>
                . Ethereum, no Sky testnet plugin.
              </li>
              <li>
                <span className="text-fg">KeeperHub</span> is MCP at
                app.keeperhub.com/mcp. Turnkey wallet, gas, nonce. Guest
                execution URLs 404. Etherscan is the public proof.
              </li>
              <li>
                <span className="text-fg">This repo</span> is policy, compose,
                dry-run adapter, audit, desk. Not a lending market.
              </li>
            </ul>
          </section>

          <section id="input" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Input</h2>
            <p className="mt-3">
              <code className="font-mono text-fg">src/lib/pipeline-input.ts</code>
              . Prompt 1–400 chars, tags stripped. Key empty or{" "}
              <code className="font-mono text-fg">kh_</code>. Kill switch may
              force ON, never OFF. Cooldown is server-side; the client timestamp
              is ignored. Server re-parses. The client is not trusted. User keys{" "}
              <code className="font-mono text-fg">wfb_</code> 401.
            </p>
          </section>

          <section id="compose" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Compose</h2>
            <p className="mt-3">
              <code className="font-mono text-fg">composeIntent</code> takes
              the first number-like token as amount. Scientific notation is
              kept so policy can reject it. No number plus “approve” → 0.
              Otherwise 1. withdraw → sUSDS vault out. redeem →{" "}
              <code className="font-mono text-fg">sky/vault-redeem</code>, not
              deposit. approve →{" "}
              <code className="font-mono text-fg">sky/approve-usds</code>.
              deposit/save →{" "}
              <code className="font-mono text-fg">sky/vault-deposit</code>.
              Chain is always 1. Spender is always the vault. Receiver is the
              org wallet, never 0x0.
            </p>
            <p className="mt-3">
              <code className="font-mono text-fg">workflowFromIntent</code>{" "}
              builds a Manual trigger plus Sky nodes,{" "}
              <code className="font-mono text-fg">enabled: false</code>. Deposit
              is two writes: approve then vault-deposit. Amounts are wei-18.
            </p>
          </section>

          <section id="policy" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Policy</h2>
            <p className="mt-3">
              <code className="font-mono text-fg">assertAllowed</code> is
              deterministic. Order: kill switch (env sticky), chain 1, Sky
              action allowlist, USDS or sUSDS, amount ≤ 10 in wei-18, non-zero
              receiver, 30s server cooldown. The desk button Policy check is
              compose plus this function. It does not call MCP. Reject skips
              Dry-run and Execute. Failure path: deposit 100 USDS.
            </p>
          </section>

          <section id="dry" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Dry-run</h2>
            <p className="mt-3">
              KeeperHub <code className="font-mono text-fg">test_workflow</code>{" "}
              is still on their roadmap. We validate the graph, then{" "}
              <code className="font-mono text-fg">POST /api/execute/contract-call</code>{" "}
              with <code className="font-mono text-fg">simulate: true</code>.
              Approve hits USDS.approve. Deposit hits vault.deposit. Withdraw
              hits vault.withdraw. Redeem hits vault.redeem. We do not
              simulate a withdraw as deposit. We do not
              call <code className="font-mono text-fg">/api/execute/sky/approve-usds</code>{" "}
              for dry-run — that path ignored simulate in our tests and
              broadcast.
            </p>
          </section>

          <section id="exec" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Execute</h2>
            <p className="mt-3">
              MCP <code className="font-mono text-fg">create_workflow</code> if
              needed, then{" "}
              <code className="font-mono text-fg">execute_workflow</code>, then
              poll <code className="font-mono text-fg">get_execution</code>.
              Wallet{" "}
              <span className="break-all font-mono text-xs text-fg">
                {PROVEN_RUN.wallet}
              </span>
              . No raw key in this repo.
            </p>
            <p className="mt-3">
              Recorded 2026-09-04:{" "}
              <code className="font-mono text-fg">sky/approve-usds</code> amount
              0, block {PROVEN_RUN.blockNumber}, run{" "}
              <code className="font-mono text-fg">{PROVEN_RUN.executionId}</code>
              . Gas sponsored. Not a deposit.
            </p>
            <a
              href={PROVEN_RUN.txUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all font-mono text-xs text-fg tabular-nums hover:text-accent"
            >
              {PROVEN_RUN.txHash}
            </a>
          </section>

          <section id="fixture" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Fixture vs live</h2>
            <p className="mt-3">
              Empty key → fixture adapter. It does not invent a hash. Execute
              returns the recorded live run. Desk rows say recorded. A{" "}
              <code className="font-mono text-fg">kh_</code> key hits live MCP.
            </p>
          </section>

          <section id="fail" className="scroll-mt-8">
            <h2 className="text-base font-medium text-fg">Failure paths</h2>
            <ul className="mt-3 space-y-2">
              <li>Amount 100 → policy reject. No write.</li>
              <li>Kill switch → Execute blocked. No write. Client cannot turn env OFF.</li>
              <li>wouldRevert → dry_run_fail. Execute skipped.</li>
              <li>Unfunded deposit → vault would revert (org USDS is 0).</li>
              <li>Receiver 0x0 → policy reject. No mint-to-burn.</li>
              <li>Fixture execute → recorded hash, labeled recorded.</li>
            </ul>
            <p className="mt-4">
              Markdown copy for GitHub:{" "}
              <a
                href="https://github.com/Kohap/keeperhub-sky-exec/blob/main/docs/MECHANISM.md"
                className="text-fg hover:text-accent"
              >
                docs/MECHANISM.md
              </a>
              .{" "}
              <Link to="/desk" className="text-fg hover:text-accent">
                Open the desk
              </Link>
              .
            </p>
          </section>
        </div>
        <SiteFooter />
      </div>
    </SiteFrame>
  );
}
