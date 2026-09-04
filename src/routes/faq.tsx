import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteNav } from "@/components/site-shell";

export const Route = createFileRoute("/faq")({ component: FaqPage });

const FAQS = [
  {
    q: "What is Sky Exec?",
    a: "A Claude/MCP agent composes a Sky sUSDS deposit or withdraw workflow on KeeperHub. You review it, dry-run with no chain write, then that exact workflow executes. Sky is the live savings market. KeeperHub is the execution layer. This repo is the glue.",
  },
  {
    q: "Is the hash on the home page a new broadcast?",
    a: "No. It is the recorded KeeperHub execute from 2026-09-04: Sky approve 0 USDS for the sUSDS vault on Ethereum. Fixture mode replays that hash. It is not a deposit and not a mock.",
  },
  {
    q: "What is fixture mode?",
    a: "Empty KeeperHub key, or last.mode === fixture. The desk banner says so. Last-run and audit rows are labeled recorded so the baked hash cannot be mistaken for a live send.",
  },
  {
    q: "What are the policy gates?",
    a: "Cap 10 USDS, USDS and sUSDS only, Ethereum (chain 1), 30s cooldown, kill switch. A policy reject never hits chain. Deposit 100 USDS is the failure path.",
  },
  {
    q: "How do I run the 90-second path?",
    a: "Open the desk. Success path. Policy check. Dry-run. Execute. Last run recorded. Then Policy reject to see a kill without a write.",
  },
  {
    q: "Who owns this?",
    a: "Copyright 2026 Gift. Sky Protocol and KeeperHub are not Gift's products. This is a DoraHacks integration into those live systems.",
  },
] as const;

function FaqPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
      <SiteNav />
      <h1 className="mt-10 font-display text-3xl tracking-display">FAQ</h1>
      <dl className="mt-8">
        {FAQS.map((item) => (
          <div key={item.q} className="border-t border-border py-5">
            <dt className="text-base font-medium">{item.q}</dt>
            <dd className="mt-2 max-w-2xl text-sm leading-normal text-muted">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
      <SiteFooter />
    </main>
  );
}
