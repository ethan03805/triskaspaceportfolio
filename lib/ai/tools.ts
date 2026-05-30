import "server-only";
import { tool } from "ai";
import { z } from "zod";
import {
  getPublicProjectById,
  getFeaturedPublicProjects,
  getGatedPublicProjects,
  getPublicSkills,
  getPublicExperience,
  getPublicEducation,
  getPublicContact,
} from "@/content/index";
import { publicProjectSchema } from "@/content/schema";

export function buildTools() {
  return {
    showProject: tool({
      description: "Render a single project as a live component. Use for any project the visitor should see.",
      inputSchema: z.object({
        id: z.string().describe("project id, e.g. serenity, axiom, vox"),
        emphasis: z.array(z.string()).default([]).describe("optional keys to highlight"),
      }),
      execute: async ({ id, emphasis }) => {
        const project = getPublicProjectById(id);
        if (!project) throw new Error(`unknown project: ${id}`);
        return { project: publicProjectSchema.parse(project), emphasis };
      },
    }),
    showSerenity: tool({
      description:
        "Render the live Serenity Radio component: the current track, on-air status, and an on-site player. Use this for Serenity Radio instead of showProject whenever the visitor asks about it or wants to listen.",
      inputSchema: z.object({}),
      execute: async () => {
        const project = getPublicProjectById("serenity");
        if (!project) throw new Error("serenity project missing");
        return { project: publicProjectSchema.parse(project) };
      },
    }),
    showProjects: tool({
      description:
        "Render an overview of multiple projects. Pass `lead` (the id most relevant to this visitor) to feature it. Set `includeGated: true` only for aerospace or security visitors, or on direct request.",
      inputSchema: z.object({
        lead: z.string().optional().describe("id of the project to feature, e.g. axiom"),
        includeGated: z
          .boolean()
          .default(false)
          .describe("surface gated projects (aerospace/security relevance only)"),
        emphasis: z.array(z.string()).default([]).describe("optional keywords to highlight"),
      }),
      execute: async ({ lead, includeGated, emphasis }) => {
        const featured = getFeaturedPublicProjects();
        const leadProject =
          (lead ? getPublicProjectById(lead) : undefined) ?? featured[0];
        const others = featured.filter((p) => p.id !== leadProject.id);
        const gated = includeGated ? getGatedPublicProjects() : [];
        return {
          lead: publicProjectSchema.parse(leadProject),
          others: others.map((p) => publicProjectSchema.parse(p)),
          gated: gated.map((p) => publicProjectSchema.parse(p)),
          emphasis,
        };
      },
    }),
    showSkills: tool({
      description:
        "Render Ethan's skills, grouped. Pass `emphasis` (keywords or group ids relevant to this visitor) to highlight the most relevant groups; the rest recede.",
      inputSchema: z.object({
        emphasis: z.array(z.string()).default([]).describe("keywords/ids to highlight, e.g. ai, data"),
      }),
      execute: async ({ emphasis }) => ({ groups: getPublicSkills(), emphasis }),
    }),
    showExperience: tool({
      description:
        "Render Ethan's work experience. Pass `emphasis` (keywords, org names, or ids) to highlight the most relevant roles; the rest recede.",
      inputSchema: z.object({
        emphasis: z.array(z.string()).default([]).describe("keywords/ids to highlight"),
      }),
      execute: async ({ emphasis }) => ({ entries: getPublicExperience(), emphasis }),
    }),
    showEducation: tool({
      description: "Render Ethan's education (degrees, schools, honors).",
      inputSchema: z.object({}),
      execute: async () => ({ entries: getPublicEducation() }),
    }),
    showContact: tool({
      description: "Render contact info: email, a resume download, and links to Ethan's live project sites.",
      inputSchema: z.object({}),
      execute: async () => getPublicContact(),
    }),
    suggestDirections: tool({
      description:
        "Propose 2 to 3 short next directions for the visitor, tailored to them and to what was already asked. Call this at the end of most turns.",
      inputSchema: z.object({
        directions: z.array(z.string()).min(1).describe("2 to 3 short prompts the visitor might tap"),
      }),
      execute: async ({ directions }) => ({
        directions: directions.map((d) => d.trim()).filter(Boolean).slice(0, 3),
      }),
    }),
    showDiagram: tool({
      description:
        "Render a small diagram from Mermaid source (flowchart, sequence, simple graph). Use sparingly, only when a diagram genuinely clarifies a relationship or process. Keep it small.",
      inputSchema: z.object({
        title: z.string().optional().describe("short caption for the diagram"),
        mermaid: z.string().min(1).describe("Mermaid diagram source, e.g. 'graph TD; A-->B'"),
      }),
      execute: async ({ title, mermaid }) => ({
        title: title?.trim() ? title.trim() : null,
        mermaid: mermaid.slice(0, 4000),
      }),
    }),
  };
}
export type Tools = ReturnType<typeof buildTools>;
