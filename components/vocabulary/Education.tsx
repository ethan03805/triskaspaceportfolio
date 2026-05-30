"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Education.module.css";

const renderSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      degree: z.string(),
      school: z.string(),
      location: z.string(),
      meta: z.string(),
    }),
  ),
});

export function EducationComponent(props: {
  entries: { id: string; degree: string; school: string; location: string; meta: string }[];
}) {
  const { entries } = renderSchema.parse(props);
  return (
    <Composed className={styles.wrap}>
      {entries.map((e) => (
        <div key={e.id} className={styles.entry}>
          <div className={styles.degree}>{e.degree}, {e.school}</div>
          <div className={styles.meta}>{e.location} · {e.meta}</div>
        </div>
      ))}
    </Composed>
  );
}
