import {
  SUSDS_VAULT_ADDRESS,
  USDS_ADDRESS,
} from "./sky.ts";
import { PROVEN_RUN } from "./proof.ts";
import type {
  DryRunResult,
  KeeperHubClient,
  KeeperHubRun,
  SkyActionSchema,
  Workflow,
} from "./types.ts";

export type McpAdapterOptions = {
  apiKey: string;
  mcpUrl?: string;
  apiUrl?: string;
};

type Json = Record<string, unknown>;

function clipKey(key: string): string {
  return key.slice(0, 8) + "…";
}

function parseToolText(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const root = payload as Json;
  const result = (root.result ?? root) as Json;
  const content = result.content;
  if (Array.isArray(content) && content[0] && typeof content[0] === "object") {
    const text = (content[0] as Json).text;
    if (typeof text === "string") {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return result;
}

export function createMcpAdapter(opts: McpAdapterOptions): KeeperHubClient {
  if (!opts.apiKey || !opts.apiKey.startsWith("kh_")) {
    throw new Error("KeeperHub org API key required (kh_ prefix).");
  }
  const mcpUrl = opts.mcpUrl ?? "https://app.keeperhub.com/mcp";
  const apiUrl = opts.apiUrl ?? "https://app.keeperhub.com";
  let sessionId: string | null = null;
  let rpcId = 1;
  let initialized = false;

  async function rest<T>(
    path: string,
    init: { method?: string; body?: unknown; extra?: Record<string, string> } = {},
  ): Promise<{ status: number; json: T }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.apiKey}`,
      Accept: "application/json",
      Origin: apiUrl,
      ...(init.extra ?? {}),
    };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`${apiUrl}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const json = (await res.json()) as T;
    return { status: res.status, json };
  }

  async function mcp(method: string, params?: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Protocol-Version": "2025-06-18",
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;
    const res = await fetch(mcpUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: rpcId++,
        method,
        params: params ?? {},
      }),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) sessionId = sid;
    const ctype = res.headers.get("content-type") ?? "";
    const text = await res.text();
    if (ctype.includes("text/event-stream")) {
      const datas: string[] = [];
      for (const line of text.split("\n")) {
        if (line.startsWith("data:")) datas.push(line.slice(5).trim());
      }
      return datas.length ? JSON.parse(datas[datas.length - 1]!) : { _raw: text };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { _raw: text };
    }
  }

  async function ensureInit() {
    if (initialized) return;
    await mcp("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "keeperhub-sky-exec", version: "0.1.0" },
    });
    await mcp("notifications/initialized", {});
    initialized = true;
  }

  async function callTool(name: string, args: Record<string, unknown>) {
    await ensureInit();
    const raw = await mcp("tools/call", { name, arguments: args });
    const parsed = parseToolText(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as Json).isError === true
    ) {
      throw new Error(JSON.stringify(parsed));
    }
    return parsed;
  }

  function explorerTx(hash: string, chainId = 1): string {
    if (chainId === 1) return `https://etherscan.io/tx/${hash}`;
    return `https://etherscan.io/tx/${hash}`;
  }

  function runFromExecution(parsed: Json, fallbackId?: string): KeeperHubRun {
    const txsRaw = Array.isArray(parsed.transactionHashes)
      ? parsed.transactionHashes
      : [];
    const transactions = txsRaw.map((t) => {
      const row = t as Json;
      return {
        hash: String(row.hash ?? ""),
        chainId: Number(row.chainId ?? 1),
        verified: Boolean(row.verified),
        receiptStatus: row.receiptStatus ? String(row.receiptStatus) : undefined,
        blockNumber: row.blockNumber ? Number(row.blockNumber) : undefined,
        nodeName: row.nodeName ? String(row.nodeName) : undefined,
      };
    });
    const first = transactions[0];
    return {
      executionId: String(parsed.executionId ?? parsed.id ?? fallbackId ?? ""),
      workflowId: parsed.workflowId ? String(parsed.workflowId) : undefined,
      status: String(parsed.status ?? "unknown"),
      txHash: first?.hash,
      txLink: first?.hash
        ? explorerTx(first.hash, first.chainId)
        : undefined,
      transactions,
      rawJson: JSON.stringify(parsed).slice(0, 8000),
      error: parsed.error ? String(parsed.error) : undefined,
    };
  }

  return {
    async listSkyActions() {
      const parsed = (await callTool("search_protocol_actions", {
        query: "sky",
      })) as Json;
      const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      return actions.map((a) => {
        const row = a as Json;
        return {
          actionType: String(row.actionType),
          label: String(row.label ?? row.actionType),
          description: row.description ? String(row.description) : undefined,
          requiresCredentials: Boolean(row.requiresCredentials),
          requiredFields: (row.requiredFields ?? {}) as Record<string, string>,
        } satisfies SkyActionSchema;
      });
    },

    async createWorkflow(workflow) {
      const parsed = (await callTool("create_workflow", {
        name: workflow.name,
        description: workflow.description,
        enabled: false,
        nodes: workflow.nodes,
        edges: workflow.edges,
        idempotency_key: `create:${workflow.name}`,
      })) as Json;
      return {
        ...workflow,
        id: String(parsed.id ?? workflow.id ?? ""),
      };
    },

    async dryRun(workflow) {
      // Workflow-level test_workflow is still on KeeperHub's roadmap.
      // We validate the graph, then simulate the first Sky write via REST.
      if (workflow.id) {
        await callTool("validate_workflow", { workflowId: workflow.id });
      }
      const write = workflow.nodes.find(
        (n) =>
          n.type === "action" &&
          typeof n.data.config.actionType === "string" &&
          (n.data.config.actionType === "sky/approve-usds" ||
            n.data.config.actionType === "sky/vault-deposit" ||
            n.data.config.actionType === "sky/vault-withdraw"),
      );
      if (!write) {
        return {
          ok: true,
          status: "validated",
          detailsJson: JSON.stringify({ note: "No Sky write node to simulate." }),
        };
      }
      const action = write.data.config.actionType;
      if (action === "sky/approve-usds") {
        const { status, json } = await rest<Json>(
          "/api/execute/contract-call",
          {
            method: "POST",
            body: {
              chainId: 1,
              contractAddress: USDS_ADDRESS,
              functionName: "approve",
              functionArgs: JSON.stringify([
                write.data.config.spender ?? SUSDS_VAULT_ADDRESS,
                write.data.config.amount ?? "0",
              ]),
              simulate: true,
            },
          },
        );
        const wouldRevert = Boolean((json as Json).wouldRevert);
        return {
          ok: status < 400 && !wouldRevert,
          status: String((json as Json).status ?? "simulated"),
          wouldRevert,
          gasEstimate: (json as Json).gasEstimate
            ? String((json as Json).gasEstimate)
            : undefined,
          from: (json as Json).from ? String((json as Json).from) : undefined,
          to: (json as Json).to ? String((json as Json).to) : undefined,
          detailsJson: JSON.stringify(json).slice(0, 4000),
          error: (json as Json).error ? String((json as Json).error) : undefined,
        };
      }
      const { status, json } = await rest<Json>("/api/execute/contract-call", {
        method: "POST",
        body: {
          chainId: 1,
          contractAddress: SUSDS_VAULT_ADDRESS,
          functionName: "deposit",
          functionArgs: JSON.stringify([
            write.data.config.assets ?? "0",
            write.data.config.receiver ??
              "0x0000000000000000000000000000000000000000",
          ]),
          simulate: true,
        },
      });
      const wouldRevert = Boolean((json as Json).wouldRevert) || status >= 400;
      return {
        ok: status < 400 && !wouldRevert,
        status: String((json as Json).status ?? (wouldRevert ? "would_revert" : "simulated")),
        wouldRevert,
        gasEstimate: (json as Json).gasEstimate
          ? String((json as Json).gasEstimate)
          : undefined,
        from: (json as Json).from ? String((json as Json).from) : undefined,
        to: (json as Json).to ? String((json as Json).to) : undefined,
        detailsJson: JSON.stringify(json).slice(0, 4000),
        error:
          (json as Json).error || (json as Json).message
            ? String((json as Json).error ?? (json as Json).message)
            : undefined,
      };
    },

    async execute(workflow) {
      let id = workflow.id;
      if (!id) {
        const created = await this.createWorkflow(workflow);
        id = created.id;
      }
      const parsed = (await callTool("execute_workflow", {
        workflowId: id,
        idempotency_key: `exec:${id}:${Date.now()}`,
      })) as Json;
      const executionId = String(parsed.executionId ?? "");
      if (!executionId) {
        throw new Error(`execute_workflow did not return an id (${clipKey(opts.apiKey)})`);
      }
      for (let i = 0; i < 30; i++) {
        const run = await this.getRun(executionId);
        if (
          ["success", "error", "system_error", "cancelled", "failed", "completed"].includes(
            run.status,
          )
        ) {
          return { ...run, workflowId: id };
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      return {
        executionId,
        workflowId: id,
        status: "timeout",
        transactions: [],
        rawJson: JSON.stringify({ executionId }),
        error: "Timed out waiting for KeeperHub execution.",
      };
    },

    async getRun(id) {
      const parsed = (await callTool("get_execution", {
        executionId: id,
        includeData: true,
      })) as Json;
      return runFromExecution(parsed, id);
    },
  };
}

export function provenRunAsKeeperHubRun(): KeeperHubRun {
  return {
    executionId: PROVEN_RUN.executionId,
    workflowId: PROVEN_RUN.approveWorkflowId,
    status: "success",
    txHash: PROVEN_RUN.txHash,
    txLink: PROVEN_RUN.txUrl,
    transactions: [
      {
        hash: PROVEN_RUN.txHash,
        chainId: 1,
        verified: true,
        receiptStatus: "success",
        blockNumber: PROVEN_RUN.blockNumber,
        nodeName: "Approve USDS for sUSDS",
      },
    ],
    rawJson: JSON.stringify(PROVEN_RUN),
  };
}
