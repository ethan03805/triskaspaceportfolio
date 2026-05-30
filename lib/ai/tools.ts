import "server-only";
import { tool } from "ai";
import { z } from "zod";
import {
  getPublicProjectById,
  getFeaturedPublicProjects,
  getGatedPublicProjects,
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
  };
}
export type Tools = ReturnType<typeof buildTools>;
