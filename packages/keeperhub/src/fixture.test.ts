import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeIntent, workflowFromIntent } from "./compose.ts";
import { createFixtureAdapter } from "./fixture.ts";
import { PROVEN_RUN } from "./proof.ts";
import { ZERO_ADDRESS } from "./sky.ts";

describe("composeIntent", () => {
  it("maps the DoraHacks one-liner to a Sky deposit of 100", () => {
    const i = composeIntent("deposit spare USDS above 100 into sUSDS");
    assert.equal(i.actionType, "sky/vault-deposit");
    assert.equal(i.asset, "USDS");
    assert.equal(i.amountHuman, "100");
    assert.equal(i.chainId, 1);
    assert.ok(i.receiver);
    assert.notEqual(i.receiver?.toLowerCase(), ZERO_ADDRESS);
  });

  it("maps approve 0 to sky/approve-usds", () => {
    const i = composeIntent("approve 0 USDS for the sUSDS vault");
    assert.equal(i.actionType, "sky/approve-usds");
    assert.equal(i.amountHuman, "0");
  });

  it("maps redeem to sky/vault-redeem, not deposit", () => {
    const i = composeIntent("redeem 1 sUSDS");
    assert.equal(i.actionType, "sky/vault-redeem");
    assert.equal(i.asset, "sUSDS");
    const wf = workflowFromIntent(i);
    assert.ok(
      wf.nodes.some((n) => n.data.config.actionType === "sky/vault-redeem"),
    );
    assert.equal(
      wf.nodes.some((n) => n.data.config.actionType === "sky/vault-deposit"),
      false,
    );
  });

  it("maps withdraw to sky/vault-withdraw", () => {
    const i = composeIntent("withdraw 1 USDS from sUSDS");
    assert.equal(i.actionType, "sky/vault-withdraw");
    const wf = workflowFromIntent(i);
    assert.ok(
      wf.nodes.some((n) => n.data.config.actionType === "sky/vault-withdraw"),
    );
  });

  it("keeps scientific tokens so policy can reject them", () => {
    const i = composeIntent("deposit 1e2 USDS into sUSDS");
    assert.equal(i.amountHuman, "1e2");
  });
});

describe("workflowFromIntent receiver", () => {
  it("never emits the zero address on deposit, withdraw, or redeem", () => {
    for (const prompt of [
      "deposit 1 USDS into sUSDS",
      "withdraw 1 USDS from sUSDS",
      "redeem 1 sUSDS",
    ]) {
      const wf = workflowFromIntent(composeIntent(prompt));
      for (const node of wf.nodes) {
        const cfg = node.data.config;
        if (cfg.receiver) {
          assert.notEqual(cfg.receiver.toLowerCase(), ZERO_ADDRESS);
        }
        if (cfg.owner) {
          assert.notEqual(cfg.owner.toLowerCase(), ZERO_ADDRESS);
        }
      }
    }
  });
});

describe("fixture adapter", () => {
  it("dry-runs approve as the recorded simulation", async () => {
    const kh = createFixtureAdapter();
    const wf = workflowFromIntent(
      composeIntent("approve 0 USDS for the sUSDS vault"),
    );
    const d = await kh.dryRun(wf);
    assert.equal(d.ok, true);
    assert.equal(d.wouldRevert, false);
  });

  it("returns the real KeeperHub hash on execute, never a fake one", async () => {
    const kh = createFixtureAdapter();
    const run = await kh.execute(
      workflowFromIntent(composeIntent("approve 0 USDS for the sUSDS vault")),
    );
    assert.equal(run.executionId, PROVEN_RUN.executionId);
    assert.equal(run.txHash, PROVEN_RUN.txHash);
  });

  it("does not fake a deposit", async () => {
    const kh = createFixtureAdapter();
    const d = await kh.dryRun(
      workflowFromIntent(
        composeIntent("deposit spare USDS above 100 into sUSDS"),
      ),
    );
    assert.equal(d.ok, false);
  });

  it("does not fake a withdraw", async () => {
    const kh = createFixtureAdapter();
    const d = await kh.dryRun(
      workflowFromIntent(composeIntent("withdraw 1 USDS from sUSDS")),
    );
    assert.equal(d.ok, false);
  });
});
