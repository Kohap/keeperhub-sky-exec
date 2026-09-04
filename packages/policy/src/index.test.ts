import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllowed,
  loadLimitsFromEnv,
  type Intent,
} from "./index.ts";

const base: Intent = {
  prompt: "approve 0 USDS for sUSDS",
  actionType: "sky/approve-usds",
  asset: "USDS",
  amountHuman: "0",
  chainId: 1,
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
});
