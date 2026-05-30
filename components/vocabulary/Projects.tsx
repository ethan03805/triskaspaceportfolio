"use client";
import { Composed } from "@/components/motion/Composed";
import { renderProjectSchema, type RenderProject } from "./projectShape";
import styles from "./Projects.module.css";

function Row({ p }: { p: RenderProject }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowName}>{p.name}</span>
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a>
        ) : null}
      </div>
      <div className={styles.rowTagline}>{p.tagline}</div>
      <div className={styles.meta}>{p.tech} · {p.year}</div>
    </div>
  );
}

export function ProjectsComponent({
  lead, others, gated, emphasis: _emphasis,
}: {
  lead: RenderProject;
  others: RenderProject[];
  gated: RenderProject[];
  emphasis: string[];
}) {
  const leadP = renderProjectSchema.parse(lead);
  const rows = others.map((p) => renderProjectSchema.parse(p));
  const gatedRows = gated.map((p) => renderProjectSchema.parse(p));

  return (
    <Composed className={styles.wrap}>
      <div className={styles.lead}>
        <div className={styles.leadName}>{leadP.name}</div>
        <div className={styles.leadTagline}>{leadP.tagline}</div>
        <div className={styles.meta}>
          {leadP.tech} · {leadP.year}
          {leadP.url ? <> · <a href={leadP.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a></> : null}
        </div>
      </div>
      {rows.map((p) => <Row key={p.id} p={p} />)}
      {gatedRows.length > 0 ? (
        <div className={styles.divider}>usually hidden, surfaced for you</div>
      ) : null}
      {gatedRows.map((p) => <Row key={p.id} p={p} />)}
    </Composed>
  );
}
