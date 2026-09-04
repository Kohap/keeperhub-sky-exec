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

export type PipelineInput = {
  prompt: string;
  apiKey?: string;
  killSwitch?: boolean;
};

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
  .validator((data: PipelineInput) => data)
  .handler(async ({ data }): Promise<PipelineOutput> => {
    const intent = composeIntent(data.prompt);
    const policy = assertAllowed(
      intent,
      loadLimitsFromEnv(process.env, { killSwitch: data.killSwitch }),
    );
    const workflow = workflowFromIntent(intent);
    return {
      intent,
      policy,
      workflowName: workflow.name,
      mode: data.apiKey?.startsWith("kh_") ? "live" : "fixture",
      error: policy.allow ? undefined : "policy_reject",
    };
  });

export const dryRunPipeline = createServerFn({ method: "POST" })
  .validator((data: PipelineInput) => data)
  .handler(async ({ data }): Promise<PipelineOutput> => {
    const intent = composeIntent(data.prompt);
    const policy = assertAllowed(
      intent,
      loadLimitsFromEnv(process.env, { killSwitch: data.killSwitch }),
    );
    const workflow = workflowFromIntent(intent);
    const { kh, mode } = pickClient(data.apiKey);
    if (!policy.allow) {
      return {
        intent,
        policy,
        workflowName: workflow.name,
        mode,
        error: "policy_reject",
      };
    }
    const dryRun = await kh.dryRun(workflow);
    return {
      intent,
      policy,
      workflowName: workflow.name,
      workflowId: workflow.id,
      dryRun,
      mode,
      error: dryRun.ok ? undefined : "dry_run_fail",
    };
  });

export const executePipeline = createServerFn({ method: "POST" })
  .validator((data: PipelineInput) => data)
  .handler(async ({ data }): Promise<PipelineOutput> => {
    const intent = composeIntent(data.prompt);
    const policy = assertAllowed(
      intent,
      loadLimitsFromEnv(process.env, { killSwitch: data.killSwitch }),
    );
    const workflow = workflowFromIntent(intent);
    const { kh, mode } = pickClient(data.apiKey);
    if (!policy.allow) {
      return {
        intent,
        policy,
        workflowName: workflow.name,
        mode,
        error: "policy_reject",
      };
    }
    const dryRun = await kh.dryRun(workflow);
    if (!dryRun.ok) {
      return {
        intent,
        policy,
        workflowName: workflow.name,
        dryRun,
        mode,
        error: "dry_run_fail",
      };
    }
    const run = await kh.execute(workflow);
    return {
      intent,
      policy,
      workflowName: workflow.name,
      workflowId: run.workflowId ?? workflow.id,
      dryRun,
      run,
      mode,
      error: run.status === "success" ? undefined : run.error ?? "execute_fail",
    };
  });
