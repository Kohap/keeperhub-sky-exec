import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuditLog, AuditRecord } from "./types.ts";

export function createJsonlAudit(filePath: string): AuditLog {
  return {
    async append(record) {
      await mkdir(dirname(filePath), { recursive: true });
      await appendFile(filePath, JSON.stringify(record) + "\n", "utf8");
    },
    async list() {
      try {
        const raw = await readFile(filePath, "utf8");
        return raw
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as AuditRecord)
          .reverse();
      } catch {
        return [];
      }
    },
  };
}
