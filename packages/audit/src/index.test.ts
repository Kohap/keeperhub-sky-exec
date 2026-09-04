import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJsonlAudit } from "./jsonl.ts";
import { createMemoryAudit, stamp } from "./memory.ts";
import type { Intent } from "../../policy/src/index.ts";

const intent: Intent = {
  prompt: "approve 0",
  actionType: "sky/approve-usds",
  asset: "USDS",
  amountHuman: "0",
  chainId: 1,
};

describe("audit", () => {
  it("appends and lists in memory", async () => {
    const log = createMemoryAudit();
    await log.append(
      stamp({
        intent,
        policy: { allow: false, reason: "KILL_SWITCH is on." },
        error: "policy_reject",
      }),
    );
    const rows = await log.list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.policy.allow, false);
  });

  it("writes JSONL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sky-audit-"));
    const file = join(dir, "audit.jsonl");
    const log = createJsonlAudit(file);
    await log.append(
      stamp({
        intent,
        policy: { allow: true },
        runId: "r7grdajtci7hf757zd9xr",
        txHash:
          "0x28a94c68511a06e77f5e0c516e893335b6c18f17caead4de3a29421072c6cc04",
        mode: "live",
      }),
    );
    const text = await readFile(file, "utf8");
    assert.match(text, /r7grdajtci7hf757zd9xr/);
    const rows = await log.list();
    assert.equal(rows[0]?.runId, "r7grdajtci7hf757zd9xr");
  });
});
