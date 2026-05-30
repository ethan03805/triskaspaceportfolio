import "server-only";
import { type SkillGroup } from "./schema";

export const skills: SkillGroup[] = [
  { id: "languages", label: "languages", items: ["Python", "SQL", "Go", "VBA", "Bash", "PowerShell"], audienceTags: ["data"] },
  { id: "ai-ml", label: "AI / ML", items: ["Agentic orchestration", "Cost-minimization inference", "NLP", "Generative UI"], audienceTags: ["ai"] },
  { id: "data", label: "data / analytics", items: ["Pandas", "NumPy", "SpaCy", "K-nearest-neighbors", "Cluster analysis", "Decision trees", "ARIMA", "Regression", "System reliability analysis"], audienceTags: ["data"] },
  { id: "tooling", label: "tooling", items: ["Git", "MS Access", "Tableau", "Pivot Tables"], audienceTags: ["general"] },
];
