import type { Intent } from "../../policy/src/index.ts";
import type { AllowedActionType } from "../../policy/src/index.ts";
import { HUMAN_AMOUNT_RE } from "../../policy/src/amount.ts";
import {
  SKY_CHAIN_ID,
  SUSDS_VAULT_ADDRESS,
  resolveReceiver,
  toWei18,
} from "./sky.ts";
import type { Workflow } from "./types.ts";

const NUMBERISH = /(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i;

export function composeIntent(
  prompt: string,
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): Intent {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const match = lower.match(NUMBERISH);
  let amountHuman = match?.[1] ?? (lower.includes("approve") ? "0" : "1");
  if (match?.[1] && !HUMAN_AMOUNT_RE.test(match[1])) {
    amountHuman = match[1];
  }

  let actionType: AllowedActionType = "sky/vault-deposit";
  if (/\bwithdraw\b|\bredeem\b/.test(lower)) {
    actionType = lower.includes("redeem")
      ? "sky/vault-redeem"
      : "sky/vault-withdraw";
  } else if (/\bapprove\b/.test(lower)) {
    actionType = "sky/approve-usds";
  } else if (/\bdeposit\b|\bsave\b|\bsusds\b/.test(lower)) {
    actionType = "sky/vault-deposit";
  }

  const asset =
    actionType.includes("withdraw") || actionType.includes("redeem")
      ? "sUSDS"
      : "USDS";

  const needsReceiver =
    actionType === "sky/vault-deposit" ||
    actionType === "sky/vault-withdraw" ||
    actionType === "sky/vault-redeem";

  return {
    prompt: text,
    actionType,
    asset,
    amountHuman,
    chainId: SKY_CHAIN_ID,
    spender: actionType === "sky/approve-usds" ? SUSDS_VAULT_ADDRESS : undefined,
    receiver: needsReceiver ? resolveReceiver(undefined, env) : undefined,
  };
}

export function workflowFromIntent(intent: Intent): Workflow {
  const amountWei = toWei18(intent.amountHuman);
  const trigger = {
    id: "trigger-1",
    type: "trigger" as const,
    data: { label: "Manual", config: { triggerType: "Manual" } },
  };

  if (intent.actionType === "sky/approve-usds") {
    return {
      name: `Sky USDS approve sUSDS (${intent.amountHuman})`,
      description: intent.prompt,
      enabled: false,
      nodes: [
        trigger,
        {
          id: "approve-1",
          type: "action",
          data: {
            label: "Approve USDS for sUSDS",
            config: {
              actionType: "sky/approve-usds",
              network: String(intent.chainId),
              spender: intent.spender ?? SUSDS_VAULT_ADDRESS,
              amount: amountWei,
            },
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger-1", target: "approve-1" }],
    };
  }

  const party = resolveReceiver(intent.receiver);

  if (intent.actionType === "sky/vault-withdraw") {
    return {
      name: `Sky sUSDS withdraw ${intent.amountHuman} USDS`,
      description: intent.prompt,
      enabled: false,
      nodes: [
        trigger,
        {
          id: "withdraw-1",
          type: "action",
          data: {
            label: "Withdraw USDS from sUSDS",
            config: {
              actionType: "sky/vault-withdraw",
              network: String(intent.chainId),
              assets: amountWei,
              receiver: party,
              owner: party,
            },
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger-1", target: "withdraw-1" }],
    };
  }

  if (intent.actionType === "sky/vault-redeem") {
    return {
      name: `Sky sUSDS redeem ${intent.amountHuman}`,
      description: intent.prompt,
      enabled: false,
      nodes: [
        trigger,
        {
          id: "redeem-1",
          type: "action",
          data: {
            label: "Redeem sUSDS for USDS",
            config: {
              actionType: "sky/vault-redeem",
              network: String(intent.chainId),
              shares: amountWei,
              receiver: party,
              owner: party,
            },
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger-1", target: "redeem-1" }],
    };
  }

  return {
    name: `Sky sUSDS deposit ${intent.amountHuman} USDS`,
    description: intent.prompt,
    enabled: false,
    nodes: [
      trigger,
      {
        id: "approve-1",
        type: "action",
        data: {
          label: "Approve USDS for sUSDS",
          config: {
            actionType: "sky/approve-usds",
            network: String(intent.chainId),
            spender: SUSDS_VAULT_ADDRESS,
            amount: amountWei,
          },
        },
      },
      {
        id: "deposit-1",
        type: "action",
        data: {
          label: "Deposit USDS into sUSDS",
          config: {
            actionType: "sky/vault-deposit",
            network: String(intent.chainId),
            assets: amountWei,
            receiver: party,
          },
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "approve-1" },
      { id: "e2", source: "approve-1", target: "deposit-1" },
    ],
  };
}
