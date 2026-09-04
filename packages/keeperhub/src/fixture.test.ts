import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeIntent, workflowFromIntent } from "./compose.ts";
import { createFixtureAdapter } from "./fixture.ts";
import { PROVEN_RUN } from "./proof.ts";

describe("composeIntent", () => {
  it("maps the DoraHacks one-liner to a Sky deposit of 100", () => {
    const i = composeIntent("deposit spare USDS above 100 into sUSDS");
    assert.equal(i.actionType, "sky/vault-deposit");
    assert.equal(i.asset, "USDS");
    assert.equal(i.amountHuman, "100");
    assert.equal(i.chainId, 1);
  });

  it("maps approve 0 to sky/approve-usds", () => {
    const i = composeIntent("approve 0 USDS for the sUSDS vault");
    assert.equal(i.actionType, "sky/approve-usds");
    assert.equal(i.amountHuman, "0");
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
});
