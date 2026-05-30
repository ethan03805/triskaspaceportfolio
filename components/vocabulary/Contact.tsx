"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Contact.module.css";

const renderSchema = z.object({
  email: z.string().email(),
  resumeUrl: z.string(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })),
});

export function ContactComponent(props: {
  email: string;
  resumeUrl: string;
  links: { label: string; url: string }[];
}) {
  const { email, resumeUrl, links } = renderSchema.parse(props);
  return (
    <Composed className={styles.card}>
      <a className={styles.primary} href={`mailto:${email}`}>{email}</a>
      <a className={styles.primary} href={resumeUrl} download>download resume</a>
      <div className={styles.links}>
        {links.map((l) => (
          <a key={l.url} className={styles.link} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </div>
    </Composed>
  );
}
