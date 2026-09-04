import type { Intent } from "../../policy/src/index.ts";

export type WorkflowNode = {
  id: string;
  type: "trigger" | "action";
  data: {
    label: string;
    config: Record<string, string>;
  };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type Workflow = {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type DryRunResult = {
  ok: boolean;
  status: string;
  wouldRevert?: boolean;
  gasEstimate?: string;
  from?: string;
  to?: string;
  detailsJson?: string;
  error?: string;
};

export type KeeperHubTx = {
  hash: string;
  chainId: number;
  verified?: boolean;
  receiptStatus?: string;
  blockNumber?: number;
  nodeName?: string;
};

export type KeeperHubRun = {
  executionId: string;
  workflowId?: string;
  status: string;
  txHash?: string;
  txLink?: string;
  transactions: KeeperHubTx[];
  rawJson?: string;
  error?: string;
};

export type SkyActionSchema = {
  actionType: string;
  label: string;
  description?: string;
  requiresCredentials: boolean;
  requiredFields: Record<string, string>;
};

export type KeeperHubClient = {
  listSkyActions(): Promise<SkyActionSchema[]>;
  createWorkflow(workflow: Workflow): Promise<Workflow>;
  dryRun(workflow: Workflow): Promise<DryRunResult>;
  execute(workflow: Workflow): Promise<KeeperHubRun>;
  getRun(id: string): Promise<KeeperHubRun>;
};

export type { Intent };
