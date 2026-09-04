import type { AuditLog, AuditRecord } from "./types.ts";

export function createMemoryAudit(seed: AuditRecord[] = []): AuditLog {
  const rows = [...seed];
  return {
    async append(record) {
      rows.unshift(record);
    },
    async list() {
      return [...rows];
    },
  };
}

export function stamp(partial: Omit<AuditRecord, "timestamp">): AuditRecord {
  return { timestamp: new Date().toISOString(), ...partial };
}
