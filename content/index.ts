import "server-only";
import { projects } from "./projects";
import { toPublicProjects } from "./public";
import type { PublicProject } from "./schema";

export const getPublicProjects = (): PublicProject[] => toPublicProjects(projects);
export const getFeaturedPublicProjects = (): PublicProject[] =>
  toPublicProjects(projects.filter((p) => p.status === "featured"));
export const getGatedPublicProjects = (): PublicProject[] =>
  toPublicProjects(projects.filter((p) => p.status === "gated"));
export const getPublicProjectById = (id: string): PublicProject | undefined => {
  const p = projects.find((x) => x.id === id);
  return p ? toPublicProjects([p])[0] : undefined;
};
