import { capToWei, parseHumanAmount } from "./amount.ts";
import { orgCooldownKey, readLastExecuteAtMs } from "./cooldown.ts";

export { capToWei, HUMAN_AMOUNT_RE, parseHumanAmount, toWei18 } from "./amount.ts";
export {
  orgCooldownKey,
  readLastExecuteAtMs,
  recordExecute,
  resetCooldownStoreForTests,
} from "./cooldown.ts";

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

const ZERO_ADDRESS_RE = /^0x0{40}$/i;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const WRITE_ACTIONS_NEED_RECEIVER: ReadonlySet<string> = new Set([
  "sky/vault-deposit",
  "sky/vault-withdraw",
  "sky/vault-redeem",
]);

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

function envFlagTrue(raw: string | undefined): boolean {
  return raw === "1" || raw === "true";
}

/**
 * Deterministic limits.
 *
 * Kill switch: env ON is sticky. Overrides may force it ON (`true`) but must
 * never force it OFF — `false ?? env` used to disable a server KILL_SWITCH.
 */
export function loadLimitsFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
  overrides: Partial<PolicyLimits> = {},
): PolicyLimits {
  const maxRaw = env.POLICY_MAX_USDS;
  const chainRaw = env.POLICY_CHAIN_ID;
  const coolRaw = env.POLICY_COOLDOWN_SECONDS;
  const envKill = envFlagTrue(env.KILL_SWITCH);
  return {
    killSwitch: envKill || overrides.killSwitch === true,
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

/**
 * Limits for an untrusted desk/CLI request. Cooldown timestamp comes from the
 * server store, never from the body. Kill switch still cannot be forced off.
 */
export function loadLimitsForRequest(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
  request: { killSwitch?: boolean; apiKey?: string } = {},
): PolicyLimits {
  return loadLimitsFromEnv(env, {
    killSwitch: request.killSwitch,
    lastExecuteAtMs: readLastExecuteAtMs(orgCooldownKey(request.apiKey)),
  });
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
  const amount = parseHumanAmount(intent.amountHuman);
  if (!amount.ok) {
    return {
      allow: false,
      reason: `Amount ${intent.amountHuman} is not a valid decimal.`,
    };
  }
  const capWei = capToWei(limits.maxAmountHuman);
  if (capWei === null) {
    return { allow: false, reason: "Policy cap is not a valid decimal." };
  }
  if (amount.wei > capWei) {
    return {
      allow: false,
      reason: `Amount ${intent.amountHuman} USDS exceeds cap ${limits.maxAmountHuman} USDS.`,
    };
  }
  if (WRITE_ACTIONS_NEED_RECEIVER.has(intent.actionType)) {
    const receiver = intent.receiver?.trim();
    if (!receiver || !ADDRESS_RE.test(receiver) || ZERO_ADDRESS_RE.test(receiver)) {
      return {
        allow: false,
        reason:
          "Receiver must be a non-zero address. Refusing 0x0 (ERC-4626 would mint or burn to the zero address).",
      };
    }
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
