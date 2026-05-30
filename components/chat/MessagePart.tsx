"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";

export function MessagePart({
  part,
}: {
  part: { type: string; state?: string; output?: unknown; text?: string };
}) {
  if (part.type === "text") return <p>{part.text}</p>;
  if (part.type === "tool-showProject") {
    if (part.state === "output-available" && part.output) {
      const out = part.output as { project: never; emphasis: string[] };
      return <ProjectComponent project={out.project} emphasis={out.emphasis ?? []} />;
    }
    return <div aria-label="composing" />;
  }
  return null;
}
