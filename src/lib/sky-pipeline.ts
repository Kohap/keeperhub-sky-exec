import { createServerFn } from "@tanstack/react-start";
import {
  assertAllowed,
  loadLimitsFromEnv,
} from "../../packages/policy/src/index.ts";
import {
  composeIntent,
  createFixtureAdapter,
  createMcpAdapter,
  PROVEN_RUN,
  workflowFromIntent,
  type DryRunResult,
  type KeeperHubClient,
  type KeeperHubRun,
} from "../../packages/keeperhub/src/index.ts";
import type { Intent, PolicyDecision } from "../../packages/policy/src/index.ts";
import { parsePipelineInputOrThrow, sanitizePrompt } from "@/lib/pipeline-input";

export type PipelineInput = {
  prompt: string;
  apiKey?: string;
  killSwitch?: boolean;
  lastExecuteAtMs?: number;
};

export type PipelineStage = "compose" | "dry" | "exec";

export type PipelineOutput = {
  intent: Intent;
  policy: PolicyDecision;
  workflowName: string;
  workflowId?: string;
  dryRun?: DryRunResult;
  run?: KeeperHubRun;
  mode: "live" | "fixture";
  error?: string;
};

function pickClient(apiKey?: string): {
  kh: KeeperHubClient;
  mode: "live" | "fixture";
} {
  const key = apiKey?.trim();
  if (key && key.startsWith("kh_")) {
    return { kh: createMcpAdapter({ apiKey: key }), mode: "live" };
  }
  return { kh: createFixtureAdapter(), mode: "fixture" };
}

/** Shared observe → policy → (dry-run) → (execute) path. MCP adapter unchanged. */
export async function runPipeline(
  data: PipelineInput,
  stage: PipelineStage,
): Promise<PipelineOutput> {
  const intent = composeIntent(sanitizePrompt(data.prompt));
  const policy = assertAllowed(
    intent,
    loadLimitsFromEnv(process.env, {
      killSwitch: data.killSwitch,
      lastExecuteAtMs: data.lastExecuteAtMs,
    }),
  );
  const workflow = workflowFromIntent(intent);
  const { kh, mode } = pickClient(data.apiKey);
  const base: PipelineOutput = {
    intent,
    policy,
    workflowName: workflow.name,
    mode,
  };
  if (!policy.allow) {
    return { ...base, error: "policy_reject" };
  }
  if (stage === "compose") {
    return base;
  }
  const dryRun = await kh.dryRun(workflow);
  if (stage === "dry" || !dryRun.ok) {
    return {
      ...base,
      workflowId: workflow.id,
      dryRun,
      error: dryRun.ok ? undefined : "dry_run_fail",
    };
  }
  const run = await kh.execute(workflow);
  return {
    ...base,
    workflowId: run.workflowId ?? workflow.id,
    dryRun,
    run,
    error: run.status === "success" ? undefined : run.error ?? "execute_fail",
  };
}

export const getProof = createServerFn({ method: "GET" }).handler(async () => {
  return PROVEN_RUN;
});

export const listSkyActions = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await fetch("https://app.keeperhub.com/api/mcp/schemas");
    if (!res.ok) {
      throw new Error(`KeeperHub schemas ${res.status}`);
    }
    const body = (await res.json()) as {
      actions?: Record<string, { label?: string; description?: string }>;
    };
    const actions = body.actions ?? {};
    return Object.entries(actions)
      .filter(([k]) => k.startsWith("sky/"))
      .map(([actionType, meta]) => ({
        actionType,
        label: meta.label ?? actionType,
        description: meta.description,
      }));
  },
);

export const composeAndGate = createServerFn({ method: "POST" })
  .validator((data: PipelineInput) => parsePipelineInputOrThrow(data))
  .handler(async ({ data }): Promise<PipelineOutput> => {
    return runPipeline(data, "compose");
  });

export const dryRunPipeline = createServerFn({ method: "POST" })
  .validator((data: PipelineInput) => parsePipelineInputOrThrow(data))
  .handler(async ({ data }): Promise<PipelineOutput> => {
    return runPipeline(data, "dry");
  });

export const executePipeline = createServerFn({ method: "POST" })
  .validator((data: PipelineInput) => parsePipelineInputOrThrow(data))
  .handler(async ({ data }): Promise<PipelineOutput> => {
    return runPipeline(data, "exec");
  });
