"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Project.module.css";

// client-safe copy of the public shape (no server-only import in client bundle)
const renderSchema = z.object({
  id: z.string(), name: z.string(), tagline: z.string(), description: z.string(),
  tech: z.string(), year: z.string(), url: z.string().url().optional(),
  repo: z.string().url().optional(), status: z.enum(["featured", "gated"]),
  audienceTags: z.array(z.string()).default([]),
  live: z.object({ kind: z.literal("serenity") }).optional(),
});
export type RenderProject = z.infer<typeof renderSchema>;

export function ProjectComponent({ project, emphasis }: { project: RenderProject; emphasis: string[] }) {
  const p = renderSchema.parse(project); // render-boundary revalidation
  return (
    <Composed className={styles.card}>
      <div className={styles.title}>{p.name}</div>
      <div className={styles.tagline}>{p.tagline}</div>
      <div className={styles.desc}>{p.description}</div>
      <div className={styles.meta}>
        {p.tech} · {p.year}
        {p.url ? <> · <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a></> : null}
      </div>
    </Composed>
  );
}
