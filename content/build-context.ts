import "server-only";
import { getPublicProjects } from "./index";
import { skills } from "./skills";
import { experience } from "./experience";
import { education } from "./education";
import { profile } from "./profile";

export function buildContext(): string {
  const lines: string[] = [];
  lines.push(`# Ethan Triska`);
  lines.push(profile.summary);
  lines.push(`Career goals: ${profile.careerGoals}`);
  lines.push(`Contact: ${profile.email}`);

  lines.push(`\n## Voice rules`);
  for (const r of profile.voiceRules) lines.push(`- ${r}`);

  lines.push(`\n## Projects`);
  for (const p of getPublicProjects()) {
    lines.push(`### ${p.name} (${p.status}) [tags: ${p.audienceTags.join(", ")}]`);
    lines.push(`${p.tagline}`);
    lines.push(`${p.description}`);
    lines.push(`Meta: ${p.tech} · ${p.year}${p.url ? ` · ${p.url}` : ""}`);
  }

  lines.push(`\n## Skills`);
  for (const s of skills) lines.push(`- ${s.label}: ${s.items.join(", ")}`);

  lines.push(`\n## Experience`);
  for (const e of experience) {
    lines.push(`- ${e.role}, ${e.org} (${e.location}, ${e.dates})`);
    for (const b of e.bullets) lines.push(`  - ${b}`);
  }

  lines.push(`\n## Education`);
  for (const e of education) lines.push(`- ${e.degree}, ${e.school} (${e.location}, ${e.meta})`);

  return lines.join("\n");
}
