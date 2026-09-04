import { RECORDED_DRY_RUN } from "./proof.ts";
import { provenRunAsKeeperHubRun } from "./mcp.ts";
import type {
  DryRunResult,
  KeeperHubClient,
  KeeperHubRun,
  SkyActionSchema,
  Workflow,
} from "./types.ts";

const SKY_ACTIONS: SkyActionSchema[] = [
  {
    actionType: "sky/approve-usds",
    label: "Sky: Approve USDS Spending",
    requiresCredentials: true,
    requiredFields: { network: "string", spender: "string", amount: "string" },
  },
  {
    actionType: "sky/vault-deposit",
    label: "Sky: Vault Deposit",
    requiresCredentials: true,
    requiredFields: { network: "string", assets: "string", receiver: "string" },
  },
  {
    actionType: "sky/vault-withdraw",
    label: "Sky: Vault Withdraw",
    requiresCredentials: true,
    requiredFields: {
      network: "string",
      assets: "string",
      receiver: "string",
      owner: "string",
    },
  },
  {
    actionType: "sky/get-usds-balance",
    label: "Sky: Get USDS Balance",
    requiresCredentials: false,
    requiredFields: { network: "string", account: "string" },
  },
];

/**
 * Test / no-key adapter. Does not call KeeperHub.
 * Execute returns the recorded live run so tests stay honest about the hash.
 */
export function createFixtureAdapter(opts?: {
  dryRunFail?: boolean;
}): KeeperHubClient {
  const runs = new Map<string, KeeperHubRun>();
  const proven = provenRunAsKeeperHubRun();
  runs.set(proven.executionId, proven);

  return {
    async listSkyActions() {
      return SKY_ACTIONS;
    },
    async createWorkflow(workflow) {
      return { ...workflow, id: workflow.id ?? "wf_fixture" };
    },
    async dryRun(workflow) {
      if (opts?.dryRunFail) {
        return {
          ok: false,
          status: "would_revert",
          wouldRevert: true,
          detailsJson: JSON.stringify({ reason: "fixture dry-run fail" }),
          error: "Simulation would revert (fixture).",
        };
      }
      const deposit = workflow.nodes.some(
        (n) => n.data.config.actionType === "sky/vault-deposit",
      );
      if (deposit) {
        return {
          ok: false,
          status: "would_revert",
          wouldRevert: true,
          detailsJson: JSON.stringify({
            reason: "Org wallet holds 0 USDS; sUSDS deposit would revert.",
          }),
          error: "Insufficient USDS in org wallet for vault-deposit.",
        };
      }
      return {
        ok: true,
        status: RECORDED_DRY_RUN.status,
        wouldRevert: RECORDED_DRY_RUN.wouldRevert,
        gasEstimate: RECORDED_DRY_RUN.gasEstimate,
        from: RECORDED_DRY_RUN.from,
        to: RECORDED_DRY_RUN.to,
        detailsJson: JSON.stringify(RECORDED_DRY_RUN),
      } satisfies DryRunResult;
    },
    async execute(workflow) {
      const deposit = workflow.nodes.some(
        (n) => n.data.config.actionType === "sky/vault-deposit",
      );
      if (deposit) {
        return {
          executionId: "fixture_deposit_blocked",
          status: "error",
          transactions: [],
          rawJson: "{}",
          error: "Fixture will not pretend a sUSDS deposit landed. Fund USDS and use a live kh_ key.",
        };
      }
      return proven;
    },
    async getRun(id) {
      return runs.get(id) ?? proven;
    },
  };
}
