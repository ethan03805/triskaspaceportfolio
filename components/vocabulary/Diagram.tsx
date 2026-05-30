"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Diagram.module.css";

export const renderDiagramSchema = z.object({
  title: z.string().nullable().optional(),
  mermaid: z.string().min(1),
});
export type RenderDiagram = z.infer<typeof renderDiagramSchema>;

let seq = 0;

export function DiagramComponent(props: { title?: string | null; mermaid: string }) {
  const { title, mermaid } = renderDiagramSchema.parse(props); // render-boundary revalidation
  const ref = useRef<HTMLDivElement | null>(null);
  const idRef = useRef("mermaid-" + ++seq);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import("mermaid");
        const mermaidApi = mod.default;
        mermaidApi.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        const { svg } = await mermaidApi.render(idRef.current, mermaid);
        if (active && ref.current) {
          ref.current.innerHTML = svg;
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [mermaid]);

  return (
    <Composed className={styles.card}>
      {title ? <div className={styles.title}>{title}</div> : null}
      {failed ? (
        <pre className={styles.fallback}>{mermaid}</pre>
      ) : (
        <div className={styles.svg} ref={ref} role="img" aria-label={title ?? "diagram"} />
      )}
    </Composed>
  );
}
