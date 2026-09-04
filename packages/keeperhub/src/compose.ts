import type { Intent } from "../../policy/src/index.ts";
import type { AllowedActionType } from "../../policy/src/index.ts";
import { SKY_CHAIN_ID, SUSDS_VAULT_ADDRESS, toWei18 } from "./sky.ts";
import type { Workflow } from "./types.ts";

const NUMBER = /(\d+(?:\.\d+)?)/;

export function composeIntent(prompt: string): Intent {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const match = lower.match(NUMBER);
  const amountHuman = match?.[1] ?? (lower.includes("approve") ? "0" : "1");

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

  const asset = actionType.includes("withdraw") || actionType.includes("redeem")
    ? "sUSDS"
    : "USDS";

  return {
    prompt: text,
    actionType,
    asset,
    amountHuman,
    chainId: SKY_CHAIN_ID,
    spender: actionType === "sky/approve-usds" ? SUSDS_VAULT_ADDRESS : undefined,
    receiver: undefined,
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
              receiver: intent.receiver ?? "0x0000000000000000000000000000000000000000",
              owner: intent.receiver ?? "0x0000000000000000000000000000000000000000",
            },
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger-1", target: "withdraw-1" }],
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
            receiver: intent.receiver ?? "0x0000000000000000000000000000000000000000",
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
