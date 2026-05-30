import "server-only";
import { type ToolCallRepairFunction, type ToolSet } from "ai";

export type RepairedShowProjectArgs = { id: string; emphasis: string[] };

/** Coerce common malformed showProject args into a valid shape, or null if unrepairable. */
export function repairShowProjectArgs(raw: unknown): RepairedShowProjectArgs | null {
  let v: unknown = raw;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    if (s.startsWith("{") || s.startsWith("[")) {
      try { v = JSON.parse(s); } catch { return null; }
    } else {
      return { id: s, emphasis: [] }; // a bare string is the id
    }
  }

  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const idRaw = o.id ?? o.project ?? o.projectId ?? o.name;
    if (typeof idRaw === "string" && idRaw.trim()) {
      const emphasis = Array.isArray(o.emphasis)
        ? o.emphasis.filter((x): x is string => typeof x === "string")
        : [];
      return { id: idRaw.trim(), emphasis };
    }
  }

  return null;
}

/**
 * v6 ToolCallRepairFunction: when a showProject tool call has malformed input,
 * rewrite it to a valid stringified payload. Returns null to leave other failures alone.
 *
 * In `ai` 6.x the failed `toolCall` is a `LanguageModelV3ToolCall`:
 *   { type: "tool-call"; toolCallId: string; toolName: string; input: string; ... }
 * The malformed arguments arrive on `.input` as a (possibly invalid) JSON string,
 * and the function must return the full tool-call object with `input` rewritten to a
 * valid stringified payload, or `null` to leave the failure unrepaired.
 */
export function makeRepairToolCall<T extends ToolSet>(): ToolCallRepairFunction<T> {
  const fn = (async ({ toolCall }) => {
    if (toolCall.toolName !== "showProject") return null;
    const repaired = repairShowProjectArgs(toolCall.input);
    if (!repaired) return null;
    return { ...toolCall, input: JSON.stringify(repaired) };
  }) as ToolCallRepairFunction<T>;
  return fn;
}
