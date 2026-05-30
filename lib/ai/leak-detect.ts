// client-safe: do NOT import "server-only" (used by MessagePart in the browser)

/**
 * True when assistant text is actually a leaked tool call / raw JSON blob
 * rather than prose, so the UI can suppress it instead of showing JSON.
 * Conservative: only flags text that is clearly machine output.
 */
export function isLeakedToolIntent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // function-call style, e.g. showProject({ ... })
  if (/\bshowProject\s*\(/.test(t)) return true;

  // explicit tool/function tags
  if (/<\/?(tool_call|tool|function_call|function)\b/i.test(t)) return true;

  // the entire message is a JSON object or array
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      JSON.parse(t);
      return true; // a whole-message JSON blob is never prose for this concierge
    } catch {
      return false; // not valid JSON => probably prose that happens to start with a brace
    }
  }

  return false;
}
