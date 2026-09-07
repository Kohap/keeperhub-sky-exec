/**
 * 18-decimal amount math. Policy and workflow construction must use the same
 * encoding so IEEE Number() cannot green-light a string that toWei18 would
 * send over the cap (or as garbage like "1e1" + 18 zeros).
 */

/** Canonical human decimal: no sign, no scientific notation, ≤18 fraction digits. */
export const HUMAN_AMOUNT_RE = /^(0|[1-9]\d*)(\.\d{1,18})?$/;

export type ParsedAmount =
  | { ok: true; wei: bigint; human: string }
  | { ok: false };

export function parseHumanAmount(human: string): ParsedAmount {
  if (typeof human !== "string") return { ok: false };
  const t = human.trim();
  if (!HUMAN_AMOUNT_RE.test(t)) return { ok: false };
  const [whole = "0", frac = ""] = t.split(".");
  const fracPad = (frac + "000000000000000000").slice(0, 18);
  const raw = `${whole}${fracPad}`.replace(/^0+(?=\d)/, "");
  return { ok: true, wei: BigInt(raw.length ? raw : "0"), human: t };
}

/** Encode a trusted human decimal to wei-18. Throws on scientific / junk strings. */
export function toWei18(human: string): string {
  const parsed = parseHumanAmount(human);
  if (!parsed.ok) {
    throw new Error(`Invalid decimal amount: ${human}`);
  }
  return parsed.wei.toString();
}

/**
 * Cap from policy config. Integer caps (the default 10) are exact.
 * Non-integers must still match HUMAN_AMOUNT_RE when stringified.
 */
export function capToWei(maxAmountHuman: number | string): bigint | null {
  if (typeof maxAmountHuman === "number") {
    if (!Number.isFinite(maxAmountHuman) || maxAmountHuman < 0) return null;
    if (!Number.isInteger(maxAmountHuman)) {
      const s = String(maxAmountHuman);
      const parsed = parseHumanAmount(s);
      return parsed.ok ? parsed.wei : null;
    }
    const parsed = parseHumanAmount(String(maxAmountHuman));
    return parsed.ok ? parsed.wei : null;
  }
  const parsed = parseHumanAmount(maxAmountHuman.trim());
  return parsed.ok ? parsed.wei : null;
}
