"use client";
import { Composed } from "@/components/motion/Composed";
import { renderProjectSchema, type RenderProject } from "./projectShape";
import styles from "./Project.module.css";

export type { RenderProject };

export function ProjectComponent({ project, emphasis }: { project: RenderProject; emphasis: string[] }) {
  const p = renderProjectSchema.parse(project); // render-boundary revalidation
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
