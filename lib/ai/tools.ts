import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getPublicProjectById } from "@/content/index";
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
  };
}
export type Tools = ReturnType<typeof buildTools>;
