import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllowed,
  loadLimitsForRequest,
  loadLimitsFromEnv,
  recordExecute,
  resetCooldownStoreForTests,
  type Intent,
} from "./index.ts";

const ORG = "0x0f7cc9e7dadac4d885b8878b7e08761843fe781d";

const base: Intent = {
  prompt: "approve 0 USDS for sUSDS",
  actionType: "sky/approve-usds",
  asset: "USDS",
  amountHuman: "0",
  chainId: 1,
};

const deposit: Intent = {
  prompt: "deposit 1 USDS into sUSDS",
  actionType: "sky/vault-deposit",
  asset: "USDS",
  amountHuman: "1",
  chainId: 1,
  receiver: ORG,
};

describe("assertAllowed", () => {
  it("allows an approve-0 Sky intent on Ethereum", () => {
    const d = assertAllowed(base, loadLimitsFromEnv({ KILL_SWITCH: "0" }));
    assert.equal(d.allow, true);
  });

  it("rejects kill switch", () => {
    const d = assertAllowed(base, loadLimitsFromEnv({ KILL_SWITCH: "1" }));
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /KILL_SWITCH/);
  });

  it("rejects amount over cap (the DoraHacks failure path)", () => {
    const d = assertAllowed(
      {
        ...base,
        prompt: "deposit spare USDS above 100 into sUSDS",
        actionType: "sky/vault-deposit",
        amountHuman: "100",
        receiver: ORG,
      },
      loadLimitsFromEnv({ POLICY_MAX_USDS: "10" }),
    );
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /exceeds cap/);
  });

  it("rejects non-Sky assets", () => {
    const d = assertAllowed({
      ...base,
      asset: "USDC" as Intent["asset"],
    });
    assert.equal(d.allow, false);
  });

  it("rejects unknown action types", () => {
    const d = assertAllowed({
      ...base,
      actionType: "uniswap/swap-exact-input" as Intent["actionType"],
    });
    assert.equal(d.allow, false);
  });

  it("rejects the wrong chain", () => {
    const d = assertAllowed({ ...base, chainId: 8453 });
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /Chain 8453/);
  });

  it("rejects cooldown", () => {
    const now = 1_000_000;
    const d = assertAllowed(
      base,
      loadLimitsFromEnv(
        { POLICY_COOLDOWN_SECONDS: "30" },
        { lastExecuteAtMs: now - 5_000 },
      ),
      now,
    );
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /Cooldown/);
  });

  it("does not let killSwitch:false disable env KILL_SWITCH", () => {
    const limits = loadLimitsFromEnv(
      { KILL_SWITCH: "1" },
      { killSwitch: false },
    );
    assert.equal(limits.killSwitch, true);
    const d = assertAllowed(base, limits);
    assert.equal(d.allow, false);
  });

  it("lets a client force the kill switch ON when env is off", () => {
    const limits = loadLimitsFromEnv(
      { KILL_SWITCH: "0" },
      { killSwitch: true },
    );
    assert.equal(limits.killSwitch, true);
  });

  it("rejects scientific-notation amounts that Number() would accept", () => {
    const d = assertAllowed(
      { ...deposit, amountHuman: "1e1" },
      loadLimitsFromEnv({ POLICY_MAX_USDS: "10" }),
    );
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /not a valid decimal/);
  });

  it("rejects cap-boundary dust that IEEE Number() rounds down to the cap", () => {
    const d = assertAllowed(
      { ...deposit, amountHuman: "10.000000000000000001" },
      loadLimitsFromEnv({ POLICY_MAX_USDS: "10" }),
    );
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /exceeds cap/);
  });

  it("rejects deposit/withdraw/redeem to the zero address", () => {
    const d = assertAllowed({
      ...deposit,
      receiver: "0x0000000000000000000000000000000000000000",
    });
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /non-zero address/);
  });

  it("rejects deposit with no receiver", () => {
    const d = assertAllowed({
      prompt: deposit.prompt,
      actionType: deposit.actionType,
      asset: deposit.asset,
      amountHuman: deposit.amountHuman,
      chainId: 1,
    });
    assert.equal(d.allow, false);
  });
});

describe("loadLimitsForRequest", () => {
  it("ignores a client lastExecuteAtMs and uses the server store", () => {
    resetCooldownStoreForTests();
    recordExecute("default", 1_000_000);
    const limits = loadLimitsForRequest(
      { KILL_SWITCH: "0", POLICY_COOLDOWN_SECONDS: "30" },
      { killSwitch: false },
    );
    assert.equal(limits.lastExecuteAtMs, 1_000_000);
    const d = assertAllowed(base, limits, 1_000_000 + 5_000);
    assert.equal(d.allow, false);
    if (!d.allow) assert.match(d.reason, /Cooldown/);
    resetCooldownStoreForTests();
  });

  it("does not skip cooldown when the client omits lastExecuteAtMs", () => {
    resetCooldownStoreForTests();
    recordExecute("default", Date.now() - 1_000);
    const limits = loadLimitsForRequest({ POLICY_COOLDOWN_SECONDS: "30" }, {});
    const d = assertAllowed(base, limits);
    assert.equal(d.allow, false);
    resetCooldownStoreForTests();
  });
});
