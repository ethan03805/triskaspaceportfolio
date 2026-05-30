import "server-only";
import { projects } from "./projects";
import { toPublicProjects } from "./public";
import { skills } from "./skills";
import { experience } from "./experience";
import { education } from "./education";
import { profile } from "./profile";
import {
  skillGroupSchema,
  experienceSchema,
  educationSchema,
  type PublicProject,
  type SkillGroup,
  type Experience,
  type Education,
} from "./schema";
import { RESUME_URL, publicContactSchema, type PublicContact } from "./contact";

export const getPublicProjects = (): PublicProject[] => toPublicProjects(projects);
export const getFeaturedPublicProjects = (): PublicProject[] =>
  toPublicProjects(projects.filter((p) => p.status === "featured"));
export const getGatedPublicProjects = (): PublicProject[] =>
  toPublicProjects(projects.filter((p) => p.status === "gated"));
export const getPublicProjectById = (id: string): PublicProject | undefined => {
  const p = projects.find((x) => x.id === id);
  return p ? toPublicProjects([p])[0] : undefined;
};

export const getPublicSkills = (): SkillGroup[] => skills.map((s) => skillGroupSchema.parse(s));
export const getPublicExperience = (): Experience[] =>
  experience.map((e) => experienceSchema.parse(e));
export const getPublicEducation = (): Education[] =>
  education.map((e) => educationSchema.parse(e));

export const getPublicContact = (): PublicContact => {
  const links = getPublicProjects()
    .filter((p): p is typeof p & { url: string } => typeof p.url === "string")
    .map((p) => ({ label: p.name, url: p.url }));
  return publicContactSchema.parse({ email: profile.email, resumeUrl: RESUME_URL, links });
};
