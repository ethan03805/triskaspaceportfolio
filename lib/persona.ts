export type PersonaRole =
  | "recruiter" | "hiring" | "engineer" | "founder" | "friend" | "curious";

export const TINTS: Record<PersonaRole, string> = {
  recruiter: "#93a3f8",
  hiring: "#b0a8f0",
  engineer: "#88c9a1",
  founder: "#d8b783",
  friend: "#d49bb4",
  curious: "#8fc6cf",
};

export function classifyPersona(text: string): PersonaRole {
  const t = text.toLowerCase();
  if (/\bfriend\b|buddy|know ethan|old pal/.test(t)) return "friend";
  if (/recruit|talent|sourc|headhunt/.test(t)) return "recruiter";
  if (/hiring manager|manager hiring|lead a team|my team/.test(t)) return "hiring";
  if (/found|startup|\bceo\b|co-?found|my company/.test(t)) return "founder";
  if (/engineer|developer|\bdev\b|technical|software|\bcode\b|programmer|swe/.test(t)) return "engineer";
  return "curious";
}

export const ROLE_LABEL: Record<PersonaRole, string> = {
  recruiter: "a recruiter", hiring: "a hiring manager", engineer: "an engineer",
  founder: "a founder", friend: "a friend", curious: "just curious",
};
