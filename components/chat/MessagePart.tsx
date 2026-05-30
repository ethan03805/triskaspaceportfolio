"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";
import { Skeleton } from "./Skeleton";
import { isLeakedToolIntent } from "@/lib/ai/leak-detect";
import styles from "./MessagePart.module.css";

type Part = { type: string; state?: string; output?: unknown; text?: string };

export function MessagePart({ part }: { part: Part }) {
  if (part.type === "text") {
    if (!part.text || isLeakedToolIntent(part.text)) return null;
    return <p>{part.text}</p>;
  }
  if (part.type === "tool-showProject") {
    if (part.state === "output-available" && part.output) {
      const out = part.output as { project: never; emphasis?: string[] };
      return <ProjectComponent project={out.project} emphasis={out.emphasis ?? []} />;
    }
    if (part.state === "output-error") {
      return <div className={styles.error} role="note">that one could not be loaded.</div>;
    }
    // input-streaming | input-available
    return <Skeleton />;
  }
  return null;
}
