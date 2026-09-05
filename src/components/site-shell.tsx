import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { SvStage } from "@/components/sv-stage";

const navLink = "inline-flex min-h-8 items-center text-muted hover:text-accent";
const footLink =
  "inline-flex min-h-11 items-center text-sm text-fg/90 hover:text-accent";

export function SiteNav() {
  return (
    <nav className="flex items-center justify-between gap-2 rounded-full bg-surface-2 px-3 py-2 sm:gap-3 sm:px-4">
      <Link to="/" className="flex min-h-8 min-w-0 items-center gap-2">
        <img
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-md"
        />
        <span className="truncate font-display text-sm tracking-display sm:text-base">
          Sky Exec
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-2.5 text-xs sm:gap-5 sm:text-sm">
        <Link to="/desk" className={navLink}>
          Desk
        </Link>
        <Link to="/faq" className={navLink}>
          FAQ
        </Link>
        <Link to="/social" className={navLink}>
          Social
        </Link>
      </div>
    </nav>
  );
}

export function SiteFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <SvStage>
        <div className="sv-orbit">
          <div className="sv-plane" />
        </div>
        <div className="sv-veil bg-gradient-to-r from-bg via-bg/82 to-bg/25 sm:via-bg/70 sm:to-bg/15" />
      </SvStage>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function PageHero({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mt-10">
      <div className="flex items-end gap-4">
        <img
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          className="size-14 rounded-lg"
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-display">{title}</h1>
          {children}
        </div>
      </div>
      <a
        href={PROVEN_RUN.txUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 block max-w-xl break-all font-mono text-xs leading-snug text-muted tabular-nums hover:text-accent"
      >
        {PROVEN_RUN.txHash}
      </a>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 text-sm text-muted sm:mt-20">
      <div className="relative z-10 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:gap-10 border-t border-border/80 pt-10 sm:pt-12">
        <div className="min-w-0">
          <p className="text-xs text-subtle">Product</p>
          <ul className="mt-4 flex flex-col">
            <li>
              <Link to="/desk" className={footLink}>
                Desk
              </Link>
            </li>
            <li>
              <Link to="/faq" className={footLink}>
                FAQ
              </Link>
            </li>
            <li>
              <a href={PROVEN_RUN.txUrl} target="_blank" rel="noreferrer" className={footLink}>
                Recorded run
              </a>
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-subtle">Developers</p>
          <ul className="mt-4 flex flex-col">
            <li>
              <a
                href="https://github.com/Kohap/keeperhub-sky-exec"
                target="_blank"
                rel="noreferrer"
                className={footLink}
              >
                GitHub
              </a>
            </li>
            <li>
              <a href={PROVEN_RUN.txUrl} target="_blank" rel="noreferrer" className={footLink}>
                Etherscan
              </a>
            </li>
            <li>
              <a
                href={PROVEN_RUN.approveWorkflowUrl}
                target="_blank"
                rel="noreferrer"
                className={footLink}
              >
                KeeperHub workflow
              </a>
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-subtle">Legal</p>
          <ul className="mt-4 flex flex-col">
            <li>
              <Link to="/legal" className={footLink}>
                Legal
              </Link>
            </li>
            <li>
              <Link to="/legal" hash="privacy" className={footLink}>
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/legal" hash="terms" className={footLink}>
                Terms
              </Link>
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">Trust and Social</p>
          <div className="mt-4 flex items-center gap-4">
            <a
              href="https://github.com/Kohap/keeperhub-sky-exec"
              target="_blank"
              rel="noreferrer"
              className="inline-flex size-11 items-center justify-center text-fg hover:text-accent"
              aria-label="GitHub"
            >
              <Github className="size-5" />
            </a>
            <Link to="/social" className="inline-flex min-h-11 items-center text-sm font-medium text-fg hover:text-accent">
              Social
            </Link>
          </div>
          <p className="mt-3 max-w-xs text-sm font-medium leading-snug text-fg">
            The code is open source. Auditing questions and KeeperHub
            integration notes are on GitHub.
          </p>
        </div>
      </div>
      <div className="relative z-10 mt-10 border-t border-border/80 py-6 text-center sm:mt-12">
        <p>© 2026 Gift</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <a href={PROVEN_RUN.txUrl} target="_blank" rel="noreferrer" className="hover:text-accent">
            View transaction
          </a>
          <Link to="/desk" className="hover:text-accent">
            Desk
          </Link>
          <span>Ethereum mainnet</span>
        </div>
      </div>
    </footer>
  );
}
