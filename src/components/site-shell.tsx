import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";

const navLink = "inline-flex min-h-8 items-center text-muted hover:text-accent";

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
      <div className="flex shrink-0 items-center gap-3 text-xs sm:gap-5 sm:text-sm">
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
    <footer className="mt-16 border-t border-border pt-6 text-sm text-muted">
      <p>© 2026 Gift. All rights reserved.</p>
      <p className="mt-1 max-w-xl text-xs leading-snug text-subtle">
        Sky Exec is Gift's agent, policy, dry-run, and audit glue. Sky
        Protocol, USDS, sUSDS, and KeeperHub remain their owners. Not a mock
        protocol.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          to="/legal"
          className="inline-flex min-h-8 items-center hover:text-accent"
        >
          Legal
        </Link>
        <a
          href="https://github.com/Kohap/keeperhub-sky-exec"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 items-center hover:text-accent"
        >
          GitHub
        </a>
        <a
          href={PROVEN_RUN.executionUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 items-center hover:text-accent"
        >
          KeeperHub run
        </a>
      </div>
    </footer>
  );
}
