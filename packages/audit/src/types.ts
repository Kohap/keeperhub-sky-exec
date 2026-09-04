import type { Intent, PolicyDecision } from "../../policy/src/index.ts";
import type { DryRunResult } from "../../keeperhub/src/types.ts";

export type AuditRecord = {
  timestamp: string;
  intent: Intent;
  policy: PolicyDecision;
  dryRun?: DryRunResult;
  runId?: string;
  txHash?: string;
  error?: string;
  mode?: "live" | "fixture";
};

export type AuditLog = {
  append(record: AuditRecord): Promise<void>;
  list(): Promise<AuditRecord[]>;
};
