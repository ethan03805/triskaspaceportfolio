"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import { matchesEmphasis } from "@/lib/emphasis";
import styles from "./Skills.module.css";

const renderSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      items: z.array(z.string()),
      audienceTags: z.array(z.string()).default([]),
    }),
  ),
  emphasis: z.array(z.string()).default([]),
});

export function SkillsComponent(props: {
  groups: { id: string; label: string; items: string[]; audienceTags: string[] }[];
  emphasis: string[];
}) {
  const { groups, emphasis } = renderSchema.parse(props);
  return (
    <Composed className={styles.wrap}>
      {groups.map((g) => {
        const on = matchesEmphasis(emphasis, g.id, g.label, ...g.items, ...g.audienceTags);
        return (
          <div
            key={g.id}
            data-testid={`skill-group-${g.id}`}
            data-emph={on ? "true" : "false"}
            className={`${styles.group} ${on ? styles.on : styles.off}`}
          >
            <span className={styles.label}>{g.label}</span>
            <span className={styles.items}>{g.items.join(", ")}</span>
          </div>
        );
      })}
    </Composed>
  );
}
