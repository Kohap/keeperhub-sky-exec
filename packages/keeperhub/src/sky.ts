/** Canonical Sky addresses used by this repo. Ethereum mainnet only. */
export const SKY_CHAIN_ID = 1;
export const SKY_CHAIN_NAME = "Ethereum";

export const USDS_ADDRESS = "0xdC035D45d973E3EC169d2276DDab16f1e407384F";
export const SUSDS_VAULT_ADDRESS =
  "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD";

export const SKY_WRITE_ACTIONS = [
  "sky/approve-usds",
  "sky/vault-deposit",
  "sky/vault-withdraw",
  "sky/vault-redeem",
] as const;

export function toWei18(human: string): string {
  const [whole = "0", frac = ""] = human.split(".");
  const fracPad = (frac + "000000000000000000").slice(0, 18);
  const raw = `${whole}${fracPad}`.replace(/^0+(?=\d)/, "");
  return raw.length ? raw : "0";
}
