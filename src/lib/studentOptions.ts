export const TEAM_OPTIONS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Operations",
  "Data",
  "Other",
] as const;

export const TERM_OPTIONS = ["Winter", "Spring", "Fall"] as const;

export function yearOptions(): string[] {
  const current = new Date().getFullYear();
  return [String(current + 1), String(current), String(current - 1)];
}

export type TeamOption = (typeof TEAM_OPTIONS)[number];
export type TermOption = (typeof TERM_OPTIONS)[number];
