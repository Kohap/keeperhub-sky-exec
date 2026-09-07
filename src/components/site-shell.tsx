import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PROVEN_RUN } from "../../packages/keeperhub/src/proof.ts";
import { SvStage } from "@/components/sv-stage";

const navLink = "inline-flex min-h-8 items-center text-muted hover:text-accent";
const footLink =
  "inline-flex min-h-11 items-center text-sm text-muted hover:text-accent";

export function SiteNav() {
  return (
    <nav className="flex items-center justify-between gap-3 py-1">
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
        <Link to="/pitch" className={navLink}>
          Pitch
        </Link>
        <Link to="/docs" className={navLink}>
          Docs
        </Link>
      </div>
    </nav>
  );
}

export function SiteFrame({
  children,
  wash = true,
}: {
  children: ReactNode;
  wash?: boolean;
}) {
  return (
    <div className="relative min-h-dvh">
      {wash ? (
        <SvStage>
          <div className="sv-orbit">
            <div className="sv-plane" />
          </div>
          <div className="sv-veil bg-gradient-to-r from-bg via-bg/82 to-bg/25 sm:via-bg/70 sm:to-bg/15" />
        </SvStage>
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function PageHero({
  title,
  children,
  proof = false,
}: {
  title: string;
  children?: ReactNode;
  proof?: boolean;
}) {
  return (
    <header className="mt-10">
      <h1 className="font-display text-3xl tracking-display">{title}</h1>
      {children}
      {proof ? (
        <a
          href={PROVEN_RUN.txUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 block max-w-xl break-all font-mono text-xs leading-snug text-muted tabular-nums hover:text-accent"
        >
          {PROVEN_RUN.txHash}
        </a>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border pt-6 text-sm text-muted sm:mt-20">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <Link to="/desk" className={footLink}>
          Desk
        </Link>
        <Link to="/pitch" className={footLink}>
          Pitch
        </Link>
        <Link to="/docs" className={footLink}>
          Docs
        </Link>
        <Link to="/faq" className={footLink}>
          FAQ
        </Link>
        <Link to="/legal" className={footLink}>
          Legal
        </Link>
        <a
          href="https://github.com/Kohap/keeperhub-sky-exec"
          target="_blank"
          rel="noreferrer"
          className={footLink}
        >
          GitHub
        </a>
      </div>
      <p className="mt-4 font-mono text-xs leading-snug">
        © 2026 Gift · Sky approve 0 USDS ·{" "}
        <a
          href={PROVEN_RUN.txUrl}
          target="_blank"
          rel="noreferrer"
          className="break-all text-fg tabular-nums hover:text-accent"
        >
          {PROVEN_RUN.txHash}
        </a>
      </p>
    </footer>
  );
}
