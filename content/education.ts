import "server-only";
import { type Education } from "./schema";

export const education: Education[] = [
  { id: "depaul", degree: "M.S. Computer Science", school: "DePaul University", location: "Chicago, IL", meta: "expected 2028" },
  { id: "scranton", degree: "B.S. Business Analytics, Operations Management minor", school: "University of Scranton", location: "Scranton, PA", meta: "2025 · Dean's List" },
];
