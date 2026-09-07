#!/usr/bin/env node
/**
 * Agent entry.
 *   npm run compose -- "deposit spare USDS above 100 into sUSDS"
 *   npm run compose -- "approve 0 USDS for the sUSDS vault" --dry-run
 *   npm run compose -- "approve 0 USDS for the sUSDS vault" --execute
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertAllowed,
  loadLimitsFromEnv,
  recordExecute,
  type PolicyLimits,
} from "../../policy/src/index.ts";
import {
  composeIntent,
  createFixtureAdapter,
  createMcpAdapter,
  PROVEN_RUN,
  workflowFromIntent,
  type KeeperHubClient,
} from "../../keeperhub/src/index.ts";
import { createJsonlAudit } from "../../audit/src/jsonl.ts";
import { stamp } from "../../audit/src/memory.ts";

const LAST_FILE = resolve("data/last-execute.json");
const COOL_KEY = "cli";

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function positionalPrompt(): string {
  const skipped = new Set([
    "--dry-run",
    "--execute",
    "--fixture",
    "--kill",
    "--json",
  ]);
  const words = process.argv.slice(2).filter((a) => !skipped.has(a) && !a.startsWith("--"));
  return words.join(" ").trim();
}

function client(): { kh: KeeperHubClient; mode: "live" | "fixture" } {
  const key = process.env.KEEPERHUB_API_KEY;
  if (argFlag("--fixture") || !key) {
    return { kh: createFixtureAdapter(), mode: "fixture" };
  }
  return { kh: createMcpAdapter({ apiKey: key }), mode: "live" };
}

function printDecision(label: string, value: unknown) {
  console.log(`\n[${label}]`);
  if (typeof value === "string") {
    console.log(value);
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function loadPersistedLast(): number | undefined {
  try {
    const raw = JSON.parse(readFileSync(LAST_FILE, "utf8")) as { at?: number };
    if (typeof raw.at === "number" && Number.isFinite(raw.at) && raw.at >= 0) {
      recordExecute(COOL_KEY, raw.at);
      return raw.at;
    }
  } catch {
    /* first run */
  }
  return undefined;
}

function persistLast(at: number) {
  recordExecute(COOL_KEY, at);
  try {
    mkdirSync(resolve("data"), { recursive: true });
    writeFileSync(LAST_FILE, `${JSON.stringify({ at })}\n`);
  } catch {
    /* ignore */
  }
}

async function main() {
  const prompt =
    positionalPrompt() || "deposit spare USDS above 100 into sUSDS";
  const intent = composeIntent(prompt);
  const overrides: Partial<PolicyLimits> = {
    lastExecuteAtMs: loadPersistedLast(),
  };
  if (argFlag("--kill")) overrides.killSwitch = true;
  const limits = loadLimitsFromEnv(process.env, overrides);
  const policy = assertAllowed(intent, limits);
  const audit = createJsonlAudit(resolve("data/audit.jsonl"));

  console.log("Sky Exec  ·  compose → policy → dry-run → execute → audit");
  printDecision("intent", intent);
  printDecision("policy", policy);

  if (!policy.allow) {
    await audit.append(
      stamp({
        intent,
        policy,
        error: "policy_reject",
        mode: "fixture",
      }),
    );
    console.log("\nPOLICY REJECT — execute skipped.");
    console.log(`Reason: ${policy.reason}`);
    console.log("Audit appended to data/audit.jsonl");
    process.exitCode = 2;
    return;
  }

  const workflow = workflowFromIntent(intent);
  const { kh, mode } = client();
  if (mode === "fixture") {
    console.log("\nNo KEEPERHUB_API_KEY — using fixture adapter.");
    console.log(
      `Reference live run ${PROVEN_RUN.executionId} tx ${PROVEN_RUN.txHash}`,
    );
  }

  let dry;
  if (argFlag("--dry-run") || argFlag("--execute") || true) {
    dry = await kh.dryRun(workflow);
    printDecision("dry-run", {
      ok: dry.ok,
      status: dry.status,
      wouldRevert: dry.wouldRevert,
      gasEstimate: dry.gasEstimate,
      error: dry.error,
    });
    if (!dry.ok && argFlag("--execute")) {
      await audit.append(
        stamp({ intent, policy, dryRun: dry, error: "dry_run_fail", mode }),
      );
      console.log("\nDRY-RUN FAIL — execute skipped.");
      process.exitCode = 3;
      return;
    }
  }

  if (!argFlag("--execute")) {
    await audit.append(stamp({ intent, policy, dryRun: dry, mode }));
    console.log("\nPass --execute to run through KeeperHub (requires kh_ key).");
    console.log(`Proven run: ${PROVEN_RUN.keeperhubOpenUrl}`);
    console.log(`Proven tx:  ${PROVEN_RUN.txUrl}`);
    return;
  }

  persistLast(Date.now());
  const run = await kh.execute(workflow);
  printDecision("execute", {
    executionId: run.executionId,
    status: run.status,
    txHash: run.txHash,
    txLink: run.txLink,
    error: run.error,
  });
  await audit.append(
    stamp({
      intent,
      policy,
      dryRun: dry,
      runId: run.executionId,
      txHash: run.txHash,
      error: run.error,
      mode,
    }),
  );
  if (run.status !== "success") process.exitCode = 4;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
