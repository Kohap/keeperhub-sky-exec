/**
 * Server-side last-execute timestamps.
 *
 * Cooldown must not be a client-supplied field. Omitting or backdating
 * lastExecuteAtMs used to skip the gate entirely. Callers of assertAllowed
 * that handle untrusted input must read from this store, then recordExecute
 * synchronously before the first await of execute().
 *
 * In-memory: one Node process / warm serverless instance. Best-effort across
 * instances; the CLI also persists data/last-execute.json.
 */

const lastByKey = new Map<string, number>();

export function orgCooldownKey(apiKey?: string): string {
  const key = apiKey?.trim() ?? "";
  if (key.startsWith("kh_") && key.length > 3) {
    return `kh:${key.slice(0, 10)}`;
  }
  return "default";
}

export function readLastExecuteAtMs(key = "default"): number | undefined {
  return lastByKey.get(key);
}

export function recordExecute(key = "default", atMs: number = Date.now()): number {
  lastByKey.set(key, atMs);
  return atMs;
}

/** Test helper. Do not call from production paths. */
export function resetCooldownStoreForTests(): void {
  lastByKey.clear();
}
