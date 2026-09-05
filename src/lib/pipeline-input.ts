import { z } from "zod";

/** Desk + server-fn input. Not a contact form. */
export const pipelineInputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is empty.")
    .max(400, "Prompt must be under 400 characters."),
  apiKey: z
    .string()
    .trim()
    .max(200, "Key is too long.")
    .refine(
      (v) => v === "" || /^kh_[A-Za-z0-9]+$/.test(v),
      "Key must be a KeeperHub org key (kh_…), or empty for fixture.",
    )
    .optional()
    .or(z.literal("")),
  killSwitch: z.boolean().optional(),
  lastExecuteAtMs: z.number().int().nonnegative().optional(),
});

export type PipelineForm = z.infer<typeof pipelineInputSchema>;

export function sanitizePrompt(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\0/g, "").replace(/<[^>]*>/g, "").trim();
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "prompt";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

export function parsePipelineInput(raw: unknown): {
  ok: true;
  data: {
    prompt: string;
    apiKey?: string;
    killSwitch?: boolean;
    lastExecuteAtMs?: number;
  };
} | { ok: false; errors: Record<string, string> } {
  const src =
    raw && typeof raw === "object"
      ? {
          ...(raw as Record<string, unknown>),
          prompt: sanitizePrompt(String((raw as { prompt?: unknown }).prompt ?? "")),
          apiKey:
            typeof (raw as { apiKey?: unknown }).apiKey === "string"
              ? String((raw as { apiKey: string }).apiKey).trim()
              : "",
        }
      : raw;
  const result = pipelineInputSchema.safeParse(src);
  if (!result.success) {
    return { ok: false, errors: fieldErrors(result.error) };
  }
  const apiKey = result.data.apiKey?.trim() || undefined;
  return {
    ok: true,
    data: {
      prompt: result.data.prompt,
      apiKey,
      killSwitch: result.data.killSwitch,
      lastExecuteAtMs: result.data.lastExecuteAtMs,
    },
  };
}

export function parsePipelineInputOrThrow(raw: unknown) {
  const parsed = parsePipelineInput(raw);
  if (!parsed.ok) {
    throw new Error(Object.values(parsed.errors)[0] ?? "Validation failed");
  }
  return parsed.data;
}
