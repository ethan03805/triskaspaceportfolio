// client-safe: hardened rehype-sanitize schema (no "server-only" import).
import { defaultSchema } from "rehype-sanitize";

/**
 * GFM-friendly sanitize schema for assistant prose. Starts from rehype-sanitize's
 * safe defaults (which already restrict URL protocols and strip scripts/iframes)
 * and additionally drops <img>: the assistant renders live components, never
 * remote images, so disallowing them removes a tracking / IP-leak vector.
 */
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => t !== "img"),
};
