export const MAX_OUTPUT_TOKENS = 1024;   // hard spend cap on every request
export const MAX_INPUT_CHARS = 4000;     // per-message input cap
export const MAX_MESSAGES = 20;          // messages-per-session cap

export function buildModelParams() {
  return { maxOutputTokens: MAX_OUTPUT_TOKENS } as const;
}

// `content` is optional so this also accepts AI SDK UIMessage[] (whose text
// lives in `parts`, not `content`); for those the truncation branch is a no-op
// and only the messages-per-session cap applies.
type Msg = { role: string; content?: unknown; id?: string };

export function capMessages<T extends Msg>(messages: T[]): T[] {
  const recent = messages.slice(-MAX_MESSAGES);
  return recent.map((m) =>
    typeof m.content === "string" && m.content.length > MAX_INPUT_CHARS
      ? ({ ...m, content: m.content.slice(0, MAX_INPUT_CHARS) } as T)
      : m
  );
}
