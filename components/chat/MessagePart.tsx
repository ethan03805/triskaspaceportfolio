"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";
import { ProjectsComponent } from "@/components/vocabulary/Projects";
import { SkillsComponent } from "@/components/vocabulary/Skills";
import { ExperienceComponent } from "@/components/vocabulary/Experience";
import { EducationComponent } from "@/components/vocabulary/Education";
import { ContactComponent } from "@/components/vocabulary/Contact";
import { SuggestedDirections } from "./SuggestedDirections";
import { Skeleton } from "./Skeleton";
import { isLeakedToolIntent } from "@/lib/ai/leak-detect";
import styles from "./MessagePart.module.css";

type Part = { type: string; state?: string; output?: unknown; text?: string };

function renderTool(type: string, output: unknown, onPick?: (text: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = output as any;
  switch (type) {
    case "tool-showProject":
      return <ProjectComponent project={o.project} emphasis={o.emphasis ?? []} />;
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
    case "tool-suggestDirections":
      return <SuggestedDirections directions={o.directions ?? []} onPick={onPick} />;
    default:
      return null;
  }
}

const TOOL_TYPES = new Set([
  "tool-showProject", "tool-showProjects", "tool-showSkills",
  "tool-showExperience", "tool-showEducation", "tool-showContact",
  "tool-suggestDirections",
]);

export function MessagePart({ part, onPick }: { part: Part; onPick?: (text: string) => void }) {
  if (part.type === "text") {
    if (!part.text || isLeakedToolIntent(part.text)) return null;
    return <p>{part.text}</p>;
  }
  if (TOOL_TYPES.has(part.type)) {
    if (part.state === "output-available" && part.output) {
      return renderTool(part.type, part.output, onPick);
    }
    if (part.state === "output-error") {
      return <div className={styles.error} role="note">that one could not be loaded.</div>;
    }
    // input-streaming | input-available
    return <Skeleton />;
  }
  return null;
}
