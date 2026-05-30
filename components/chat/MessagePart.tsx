"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";
import { ProjectsComponent } from "@/components/vocabulary/Projects";
import { SkillsComponent } from "@/components/vocabulary/Skills";
import { ExperienceComponent } from "@/components/vocabulary/Experience";
import { EducationComponent } from "@/components/vocabulary/Education";
import { ContactComponent } from "@/components/vocabulary/Contact";
import { SerenityComponent } from "@/components/vocabulary/Serenity";
import { DiagramComponent } from "@/components/vocabulary/Diagram";
import { Skeleton } from "./Skeleton";
import { Prose } from "./Prose";
import { isLeakedToolIntent } from "@/lib/ai/leak-detect";
import styles from "./MessagePart.module.css";

type Part = { type: string; state?: string; output?: unknown; text?: string };

function renderTool(type: string, output: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = output as any;
  switch (type) {
    case "tool-showProject":
      return <ProjectComponent project={o.project} emphasis={o.emphasis ?? []} />;
    case "tool-showSerenity":
      return <SerenityComponent project={o.project} />;
    case "tool-showProjects":
      return <ProjectsComponent lead={o.lead} others={o.others ?? []} gated={o.gated ?? []} emphasis={o.emphasis ?? []} />;
    case "tool-showSkills":
      return <SkillsComponent groups={o.groups ?? []} emphasis={o.emphasis ?? []} />;
    case "tool-showExperience":
      return <ExperienceComponent entries={o.entries ?? []} emphasis={o.emphasis ?? []} />;
    case "tool-showEducation":
      return <EducationComponent entries={o.entries ?? []} />;
    case "tool-showContact":
      return <ContactComponent email={o.email} resumeUrl={o.resumeUrl} links={o.links ?? []} />;
    case "tool-showDiagram":
      return <DiagramComponent title={o.title ?? null} mermaid={o.mermaid} />;
    default:
      return null;
  }
}

const TOOL_TYPES = new Set([
  "tool-showProject", "tool-showProjects", "tool-showSkills",
  "tool-showExperience", "tool-showEducation", "tool-showContact",
  "tool-showSerenity", "tool-showDiagram",
]);

export function MessagePart({ part }: { part: Part }) {
  if (part.type === "text") {
    if (!part.text || isLeakedToolIntent(part.text)) return null;
    return <Prose>{part.text}</Prose>;
  }
  if (TOOL_TYPES.has(part.type)) {
    if (part.state === "output-available" && part.output) {
      return renderTool(part.type, part.output);
    }
    if (part.state === "output-error") {
      return <div className={styles.error} role="note">that one could not be loaded.</div>;
    }
    // input-streaming | input-available
    return <Skeleton />;
  }
  return null;
}
