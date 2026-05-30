import "server-only";
import { z } from "zod";

export const audienceTag = z.enum([
  "aerospace", "ai", "security", "data", "business", "general",
]);

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  tech: z.string(),
  year: z.string(),
  url: z.string().url().optional(),
  repo: z.string().url().optional(),
  status: z.enum(["featured", "gated"]),
  audienceTags: z.array(audienceTag).default([]),
  live: z.object({ kind: z.literal("serenity") }).optional(),
  privateNotes: z.string().optional(),
});
export type Project = z.infer<typeof projectSchema>;
export const publicProjectSchema = projectSchema.omit({ privateNotes: true });
export type PublicProject = z.infer<typeof publicProjectSchema>;

export const skillGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  items: z.array(z.string()),
  audienceTags: z.array(audienceTag).default([]),
});
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export const experienceSchema = z.object({
  id: z.string(),
  role: z.string(),
  org: z.string(),
  location: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
  audienceTags: z.array(audienceTag).default([]),
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  id: z.string(),
  degree: z.string(),
  school: z.string(),
  location: z.string(),
  meta: z.string(),
});
export type Education = z.infer<typeof educationSchema>;

export const profileSchema = z.object({
  name: z.string(),
  wordmark: z.string(),
  email: z.string().email(),
  summary: z.string(),
  careerGoals: z.string(),
  voiceRules: z.array(z.string()),
});
export type Profile = z.infer<typeof profileSchema>;
