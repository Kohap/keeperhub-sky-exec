import { getAddress, isAddress, zeroAddress } from "viem";
import { PROVEN_RUN } from "./proof.ts";

export { toWei18, HUMAN_AMOUNT_RE, parseHumanAmount } from "../../policy/src/amount.ts";

/** Canonical Sky addresses used by this repo. Ethereum mainnet only. */
export const SKY_CHAIN_ID = 1;
export const SKY_CHAIN_NAME = "Ethereum";

export const USDS_ADDRESS = "0xdC035D45d973E3EC169d2276DDab16f1e407384F";
export const SUSDS_VAULT_ADDRESS =
  "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD";

export const ZERO_ADDRESS = zeroAddress;

export const SKY_WRITE_ACTIONS = [
  "sky/approve-usds",
  "sky/vault-deposit",
  "sky/vault-withdraw",
  "sky/vault-redeem",
] as const;

export function isZeroAddress(addr: string): boolean {
  return addr.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

/**
 * ERC-4626 receiver/owner. Never falls back to 0x0 — that mints shares to
 * the burn address on deposit and can send assets to 0x0 on withdraw.
 * Precedence: explicit intent → KEEPERHUB_ORG_WALLET → recorded org wallet.
 */
export function resolveReceiver(
  explicit?: string,
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): string {
  const raw = (explicit?.trim() ||
    env.KEEPERHUB_ORG_WALLET?.trim() ||
    PROVEN_RUN.wallet);
  if (!isAddress(raw, { strict: false })) {
    throw new Error("receiver is not a valid Ethereum address");
  }
  const addr = getAddress(raw);
  if (addr === zeroAddress) {
    throw new Error(
      "receiver must not be the zero address (ERC-4626 would mint or burn to 0x0)",
    );
  }
  return addr;
}
