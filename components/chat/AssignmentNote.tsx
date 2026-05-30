"use client";
import { Composed } from "@/components/motion/Composed";
import { ROLE_LABEL, type PersonaRole } from "@/lib/persona";
import styles from "./AssignmentNote.module.css";

export function AssignmentNote({ role, text }: { role: PersonaRole; text: string }) {
  return (
    <Composed className={styles.note}>
      <div className={styles.echo}>{text}</div>
      <div className={styles.reading}>reading you as {ROLE_LABEL[role]}</div>
    </Composed>
  );
}
