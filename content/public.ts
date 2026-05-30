import "server-only";
import { publicProjectSchema, type Project, type PublicProject } from "./schema";

export const toPublicProject = (p: Project): PublicProject =>
  publicProjectSchema.parse(p);

export const toPublicProjects = (ps: Project[]): PublicProject[] =>
  ps.map(toPublicProject);
