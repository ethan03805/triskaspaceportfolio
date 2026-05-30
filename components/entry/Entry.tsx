"use client";
import { useState } from "react";
import styles from "./Entry.module.css";
import { classifyPersona, type PersonaRole } from "@/lib/persona";

export type Declaration = { role: PersonaRole; text: string | null };

const CHIPS: { role: PersonaRole; label: string }[] = [
  { role: "recruiter", label: "recruiter" },
  { role: "hiring", label: "hiring manager" },
  { role: "engineer", label: "engineer" },
  { role: "founder", label: "founder" },
  { role: "friend", label: "friend" },
  { role: "curious", label: "just curious" },
];

export function Entry({ onDeclare }: { onDeclare: (d: Declaration) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submitText = () => {
    const v = text.trim();
    if (!v) return;
    onDeclare({ role: classifyPersona(v), text: v });
  };

  return (
    <div className={styles.entry}>
      <p className={styles.hook}>who&apos;s visiting?</p>
      <p className={styles.sub}>tell me, and his work assembles itself around you.</p>
      <div className={styles.chips}>
        {CHIPS.map((c) => (
          <button key={c.role} className={styles.chip}
            onClick={() => onDeclare({ role: c.role, text: null })}>
            [ {c.label} ]
          </button>
        ))}
      </div>
      <button className={styles.toggle} onClick={() => setOpen(true)}>or describe yourself →</button>
      <div className={`${styles.wrap} ${open ? styles.wrapOpen : ""}`}>
        <div className={styles.box}>
          <input
            className={styles.input}
            placeholder="describe yourself, e.g. recruiter at a space company, GNC team"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
          />
          <button className={styles.go} onClick={submitText} aria-label="submit">↵</button>
        </div>
      </div>
    </div>
  );
}
