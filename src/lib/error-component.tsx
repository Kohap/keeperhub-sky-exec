import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const RELOAD_KEY = "sky-exec-chunk-reload";
const CHUNK_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload/i;

export function isChunkLoadError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return CHUNK_RE.test(msg);
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <TriangleAlert className="size-8 text-danger" aria-hidden />
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
      <button
        type="button"
        className="mt-2 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* ignore */
    }
    const onPreload = (event: Event) => {
      if ("preventDefault" in event) event.preventDefault();
      try {
        if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        window.location.reload();
        return;
      }
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", onPreload);
    return () => window.removeEventListener("vite:preloadError", onPreload);
  }, []);
  return null;
}
