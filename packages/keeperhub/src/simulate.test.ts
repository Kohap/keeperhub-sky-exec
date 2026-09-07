import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeIntent, workflowFromIntent } from "./compose.ts";
import { executeIdempotencyKey, simulatePlan, simulatePlans } from "./mcp.ts";
import { SUSDS_VAULT_ADDRESS, USDS_ADDRESS, ZERO_ADDRESS } from "./sky.ts";
import type { Workflow } from "./types.ts";

describe("simulatePlan", () => {
  it("simulates approve as USDS.approve", () => {
    const plan = simulatePlan(
      workflowFromIntent(composeIntent("approve 0 USDS for the sUSDS vault")),
    );
    assert.equal(plan.kind, "call");
    if (plan.kind === "call") {
      assert.equal(plan.contractAddress, USDS_ADDRESS);
      assert.equal(plan.functionName, "approve");
    }
  });

  it("simulates deposit as vault.deposit, not a different write", () => {
    const wf = workflowFromIntent(composeIntent("deposit 1 USDS into sUSDS"));
    const plan = simulatePlan(wf);
    assert.equal(plan.kind, "call");
    if (plan.kind === "call") {
      assert.equal(plan.contractAddress, SUSDS_VAULT_ADDRESS);
      assert.equal(plan.functionName, "deposit");
      assert.notEqual(
        String(plan.functionArgs[1]).toLowerCase(),
        ZERO_ADDRESS,
      );
    }
    const names = simulatePlans(wf)
      .filter((p): p is Extract<typeof p, { kind: "call" }> => p.kind === "call")
      .map((p) => p.functionName);
    assert.deepEqual(names, ["approve", "deposit"]);
  });

  it("simulates withdraw as vault.withdraw, never deposit", () => {
    const plan = simulatePlan(
      workflowFromIntent(composeIntent("withdraw 1 USDS from sUSDS")),
    );
    assert.equal(plan.kind, "call");
    if (plan.kind === "call") {
      assert.equal(plan.functionName, "withdraw");
      assert.equal(plan.contractAddress, SUSDS_VAULT_ADDRESS);
      assert.equal(plan.functionArgs.length, 3);
    }
  });

  it("simulates redeem as vault.redeem, never deposit", () => {
    const plan = simulatePlan(
      workflowFromIntent(composeIntent("redeem 1 sUSDS")),
    );
    assert.equal(plan.kind, "call");
    if (plan.kind === "call") {
      assert.equal(plan.functionName, "redeem");
    }
  });

  it("rejects a hand-crafted deposit to 0x0", () => {
    const wf: Workflow = {
      name: "bad",
      nodes: [
        {
          id: "deposit-1",
          type: "action",
          data: {
            label: "Deposit",
            config: {
              actionType: "sky/vault-deposit",
              assets: "1",
              receiver: ZERO_ADDRESS,
            },
          },
        },
      ],
      edges: [],
    };
    const plan = simulatePlan(wf);
    assert.equal(plan.kind, "error");
  });
});

describe("executeIdempotencyKey", () => {
  it("is stable inside a cooldown window (no Date.now per call)", () => {
    const a = executeIdempotencyKey("wf1", 30, 1_000_000);
    const b = executeIdempotencyKey("wf1", 30, 1_000_000 + 5_000);
    assert.equal(a, b);
    assert.match(a, /^exec:wf1:\d+$/);
  });

  it("changes after the cooldown window", () => {
    const a = executeIdempotencyKey("wf1", 30, 0);
    const b = executeIdempotencyKey("wf1", 30, 30_000);
    assert.notEqual(a, b);
  });
});
