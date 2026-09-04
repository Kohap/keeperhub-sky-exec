import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteNav } from "@/components/site-shell";

export const Route = createFileRoute("/social")({ component: SocialPage });

const LINKS = [
  {
    label: "X",
    handle: "@gift0x4",
    href: "https://x.com/gift0x4",
    hint: "Gift on X.",
  },
  {
    label: "GitHub",
    handle: "Kohap",
    href: "https://github.com/Kohap",
    hint: "Source and the Sky Exec repo.",
  },
  {
    label: "Repo",
    handle: "keeperhub-sky-exec",
    href: "https://github.com/Kohap/keeperhub-sky-exec",
    hint: "This product.",
  },
  {
    label: "Figma",
    handle: "Gift0x",
    href: "https://www.figma.com/design/NY2QOot7eDDTyHhbSXteHT",
    hint: "Desk frame for judges.",
  },
] as const;

function SocialPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
      <SiteNav />
      <h1 className="mt-10 font-display text-3xl tracking-display">Social</h1>
      <p className="mt-3 max-w-xl text-sm leading-normal text-muted">
        Gift built Sky Exec. These are the public surfaces.
      </p>
      <ul className="mt-8">
        {LINKS.map((item) => (
          <li key={item.href} className="border-t border-border py-4">
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="text-base font-medium hover:text-accent"
            >
              {item.label}
            </a>
            <p className="mt-1 font-mono text-sm text-muted">{item.handle}</p>
            <p className="mt-1 text-sm text-subtle">{item.hint}</p>
          </li>
        ))}
      </ul>
      <SiteFooter />
    </main>
  );
}
