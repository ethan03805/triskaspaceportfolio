import "server-only";
import { z } from "zod";

/** Static asset served from public/. Replaceable with a designed resume PDF at any time. */
export const RESUME_URL = "/ethan-triska-resume.pdf";

export const publicLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});
export type PublicLink = z.infer<typeof publicLinkSchema>;

export const publicContactSchema = z.object({
  email: z.string().email(),
  resumeUrl: z.string(),
  links: z.array(publicLinkSchema),
});
export type PublicContact = z.infer<typeof publicContactSchema>;
