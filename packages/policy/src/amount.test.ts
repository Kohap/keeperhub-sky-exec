import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { capToWei, parseHumanAmount, toWei18 } from "./amount.ts";

describe("parseHumanAmount / toWei18", () => {
  it("encodes 1 as 1e18", () => {
    assert.equal(toWei18("1"), "1000000000000000000");
  });

  it("encodes 0.001", () => {
    assert.equal(toWei18("0.001"), "1000000000000000");
  });

  it("rejects scientific notation that Number() would parse", () => {
    assert.equal(parseHumanAmount("1e1").ok, false);
    assert.equal(parseHumanAmount("1E18").ok, false);
    assert.throws(() => toWei18("1e1"));
  });

  it("rejects negative, hex, and empty", () => {
    assert.equal(parseHumanAmount("-1").ok, false);
    assert.equal(parseHumanAmount("0x10").ok, false);
    assert.equal(parseHumanAmount("").ok, false);
    assert.equal(parseHumanAmount(".").ok, false);
  });

  it("keeps 1 wei above an integer cap distinct from the cap", () => {
    const dust = parseHumanAmount("10.000000000000000001");
    const cap = capToWei(10);
    assert.equal(dust.ok, true);
    assert.ok(cap !== null);
    if (dust.ok && cap !== null) {
      assert.equal(dust.wei > cap, true);
      assert.equal(dust.wei - cap, 1n);
    }
  });
});
