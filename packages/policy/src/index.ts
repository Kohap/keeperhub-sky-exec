export const ALLOWED_ACTION_TYPES = [
  "sky/get-usds-balance",
  "sky/vault-preview-deposit",
  "sky/vault-preview-withdraw",
  "sky/vault-total-assets",
  "sky/approve-usds",
  "sky/vault-deposit",
  "sky/vault-withdraw",
  "sky/vault-redeem",
] as const;

export const ALLOWED_ASSETS = ["USDS", "sUSDS"] as const;

export type AllowedActionType = (typeof ALLOWED_ACTION_TYPES)[number];
export type AllowedAsset = (typeof ALLOWED_ASSETS)[number];

export type Intent = {
  prompt: string;
  actionType: AllowedActionType;
  asset: AllowedAsset;
  /** Human-readable decimal amount in USDS (18 decimals). */
  amountHuman: string;
  chainId: number;
  spender?: string;
  receiver?: string;
};

export type PolicyLimits = {
  killSwitch: boolean;
  maxAmountHuman: number;
  allowlistedActionTypes: readonly string[];
  allowlistedAssets: readonly string[];
  chainId: number;
  cooldownSeconds: number;
  lastExecuteAtMs?: number;
};

export type PolicyAllow = { allow: true };
export type PolicyReject = { allow: false; reason: string };
export type PolicyDecision = PolicyAllow | PolicyReject;

const DEFAULT_MAX = 10;
const DEFAULT_CHAIN = 1;
const DEFAULT_COOLDOWN = 30;

export function loadLimitsFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
  overrides: Partial<PolicyLimits> = {},
): PolicyLimits {
  const maxRaw = env.POLICY_MAX_USDS;
  const chainRaw = env.POLICY_CHAIN_ID;
  const coolRaw = env.POLICY_COOLDOWN_SECONDS;
  return {
    killSwitch:
      overrides.killSwitch ??
      (env.KILL_SWITCH === "1" || env.KILL_SWITCH === "true"),
    maxAmountHuman:
      overrides.maxAmountHuman ??
      (maxRaw && Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : DEFAULT_MAX),
    allowlistedActionTypes:
      overrides.allowlistedActionTypes ?? ALLOWED_ACTION_TYPES,
    allowlistedAssets: overrides.allowlistedAssets ?? ALLOWED_ASSETS,
    chainId:
      overrides.chainId ??
      (chainRaw && Number.isFinite(Number(chainRaw))
        ? Number(chainRaw)
        : DEFAULT_CHAIN),
    cooldownSeconds:
      overrides.cooldownSeconds ??
      (coolRaw && Number.isFinite(Number(coolRaw))
        ? Number(coolRaw)
        : DEFAULT_COOLDOWN),
    lastExecuteAtMs: overrides.lastExecuteAtMs,
  };
}

function parseAmount(human: string): number | null {
  const n = Number(human);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Deterministic gate. Secrets it hides: max amount, allowlisted action types,
 * allowlisted assets (USDS/sUSDS only), cooldown, kill switch, chain id.
 */
export function assertAllowed(
  intent: Intent,
  limits: PolicyLimits = loadLimitsFromEnv(),
  nowMs: number = Date.now(),
): PolicyDecision {
  if (limits.killSwitch) {
    return {
      allow: false,
      reason: "KILL_SWITCH is on. Execute is blocked until you clear it.",
    };
  }
  if (intent.chainId !== limits.chainId) {
    return {
      allow: false,
      reason: `Chain ${intent.chainId} is not allowlisted (policy chain ${limits.chainId}). Sky sUSDS in this repo is Ethereum mainnet.`,
    };
  }
  if (!limits.allowlistedActionTypes.includes(intent.actionType)) {
    return {
      allow: false,
      reason: `Action ${intent.actionType} is not allowlisted. USDS/sUSDS Sky actions only.`,
    };
  }
  if (!limits.allowlistedAssets.includes(intent.asset)) {
    return {
      allow: false,
      reason: `Asset ${intent.asset} is not allowlisted. USDS and sUSDS only.`,
    };
  }
  const amount = parseAmount(intent.amountHuman);
  if (amount === null) {
    return { allow: false, reason: `Amount ${intent.amountHuman} is not a valid decimal.` };
  }
  if (amount > limits.maxAmountHuman) {
    return {
      allow: false,
      reason: `Amount ${intent.amountHuman} USDS exceeds cap ${limits.maxAmountHuman} USDS.`,
    };
  }
  if (
    limits.lastExecuteAtMs !== undefined &&
    limits.cooldownSeconds > 0 &&
    nowMs - limits.lastExecuteAtMs < limits.cooldownSeconds * 1000
  ) {
    const wait = Math.ceil(
      (limits.cooldownSeconds * 1000 - (nowMs - limits.lastExecuteAtMs)) / 1000,
    );
    return {
      allow: false,
      reason: `Cooldown active. Wait ${wait}s before another execute.`,
    };
  }
  return { allow: true };
}
