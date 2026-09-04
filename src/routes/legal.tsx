import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteFrame, SiteNav, PageHero } from "@/components/site-shell";

export const Route = createFileRoute("/legal")({ component: LegalPage });

function LegalPage() {
  return (
    <SiteFrame>
    <div className="mx-auto min-h-dvh max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
      <SiteNav />
      <PageHero title="Legal">
        <p className="mt-2 max-w-xl text-sm text-muted">
          © 2026 Gift. Sky and KeeperHub stay theirs.
        </p>
      </PageHero>
      <div className="mt-8 max-w-2xl space-y-8 text-sm leading-normal text-muted">
        <section>
          <h2 className="text-base font-medium text-fg">Copyright</h2>
          <p className="mt-2">
            © 2026 Gift. All rights reserved. Sky Exec, this repository, and
            original UI, policy glue, and audit trail are Gift's.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium text-fg">Not theirs, not ours</h2>
          <p className="mt-2">
            Sky Protocol, USDS, sUSDS, and related marks belong to their
            owners. KeeperHub belongs to KeeperHub. Visual Vault frames used
            on the landing belong to Ameer Talha. Gift claims none of those.
          </p>
        </section>
        <section id="terms" className="scroll-mt-8">
          <h2 className="text-base font-medium text-fg">Terms</h2>
          <p className="mt-2">
            DoraHacks, KeeperHub, The Agent Economy. Fixture mode replays a
            recorded execute. Do not treat this app as a custodian, broker, or
            offer of financial services. No wallet keys are stored in the
            repo.
          </p>
        </section>
        <section id="privacy" className="scroll-mt-8">
          <p className="mt-2">
            The desk may keep a KeeperHub org key in this browser session
            (sky-exec-kh-key). Clear key wipes it. No analytics vendor. No
            account database for judges.
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
    </SiteFrame>
  );
}
