// client-safe: no server-only (used by the Conversation client component)

export type TranscriptPart = { type: string; state?: string; output?: unknown; text?: string };
export type TranscriptMessage = { id?: string; role: string; parts?: TranscriptPart[] };

/**
 * The authored opening (the first assistant turn) is complete once the stream is
 * idle (or errored, so the visitor is not stuck) and at least one message exists.
 */
export function isOpeningComplete(status: string, messages: TranscriptMessage[]): boolean {
  return (status === "ready" || status === "error") && messages.length > 0;
}

/** Directions from the most recent assistant message that proposed any, else []. */
export function latestDirections(messages: TranscriptMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    for (const part of m.parts ?? []) {
      if (part.type === "tool-suggestDirections" && part.state === "output-available") {
        const out = part.output as { directions?: unknown } | undefined;
        if (Array.isArray(out?.directions)) {
          return out.directions.filter((d): d is string => typeof d === "string");
        }
      }
    }
  }
  return [];
}
