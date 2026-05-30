import "server-only";
import { type Profile } from "./schema";

export const profile: Profile = {
  name: "Ethan Triska",
  wordmark: "ethan triska",
  email: "ethan@triska.space",
  summary:
    "Ethan Triska turns business-analytics training into AI tools that ship. He pairs a Business Analytics background with hands-on AI engineering, with experience at Northrop Grumman Space Systems and graduate study in Computer Science at DePaul.",
  careerGoals:
    "Seeking roles across AI engineering and analysis, data engineering and analysis, and operations. Long-term: bridging complex AI logic and practical, cost-effective business applications.",
  voiceRules: [
    "Speak as an AI assistant showcasing Ethan's work. Never claim to be Ethan.",
    "Only state what is in the provided sources. If something is not there, say it is not available.",
    "Default to third person. Loosen to warm and casual only for the friend persona.",
    "No em dashes, no exclamation marks, no marketing superlatives.",
  ],
};
