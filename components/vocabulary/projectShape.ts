// client-safe copy of the public project shape (no server-only import in client bundle)
import { z } from "zod";

export const renderProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  tech: z.string(),
  year: z.string(),
  url: z.string().url().optional(),
  repo: z.string().url().optional(),
  status: z.enum(["featured", "gated"]),
  audienceTags: z.array(z.string()).default([]),
  live: z.object({ kind: z.literal("serenity") }).optional(),
});
export type RenderProject = z.infer<typeof renderProjectSchema>;
