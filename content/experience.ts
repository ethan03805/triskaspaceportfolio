import "server-only";
import { type Experience } from "./schema";

export const experience: Experience[] = [
  {
    id: "ng",
    role: "Pricing & Estimating Intern",
    org: "Northrop Grumman Space Systems",
    location: "Dulles, VA",
    dates: "Jun 2024 - Aug 2024",
    bullets: [
      "Built a Python Cost Volume generator with an Agile Scrum team that automates CV creation and assures DFARS compliance, intended for the entire Space Sector.",
      "Reviewed Basis of Estimates for accuracy and sector-policy compliance, and analyzed BOE quality, revenue, and headcount metrics in Tableau.",
      "Independently developed Pricing & Estimating onboarding training in Adobe Captivate, used across the Space Sector.",
    ],
    audienceTags: ["aerospace", "data", "business"],
  },
  {
    id: "pampco",
    role: "Data Analytics Assistant",
    org: "Pampco",
    location: "Passaic, NJ",
    dates: "Jun 2023 - Aug 2023",
    bullets: [
      "Aggregated vendor data into a single rebate-management report, improving accessibility and efficiency.",
      "Cleaned and standardized product-catalog data in Excel.",
    ],
    audienceTags: ["data", "business"],
  },
];
