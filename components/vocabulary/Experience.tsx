"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import { matchesEmphasis } from "@/lib/emphasis";
import styles from "./Experience.module.css";

const renderSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      org: z.string(),
      location: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
      audienceTags: z.array(z.string()).default([]),
    }),
  ),
  emphasis: z.array(z.string()).default([]),
});

export function ExperienceComponent(props: {
  entries: {
    id: string; role: string; org: string; location: string; dates: string;
    bullets: string[]; audienceTags: string[];
  }[];
  emphasis: string[];
}) {
  const { entries, emphasis } = renderSchema.parse(props);
  return (
    <Composed className={styles.wrap}>
      {entries.map((e) => {
        const on = matchesEmphasis(emphasis, e.id, e.org, e.role, ...e.audienceTags);
        return (
          <div
            key={e.id}
            data-testid={`xp-${e.id}`}
            data-emph={on ? "true" : "false"}
            className={`${styles.entry} ${on ? styles.on : styles.off}`}
          >
            <div className={styles.role}>{e.role}, {e.org}</div>
            <div className={styles.meta}>{e.location} · {e.dates}</div>
            <ul className={styles.bullets}>
              {e.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        );
      })}
    </Composed>
  );
}
