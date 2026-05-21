/** Demo roster and evaluator emails for seedDemo. */

export const DEMO_EVALUATOR_1 = "sarah@gmail.com";
export const DEMO_EVALUATOR_2 = "marcus@work.com";

export type DemoStudentSeed = {
  name: string;
  studentId: string;
  jobTitle: string;
  team?: string;
  term: string;
  year: string;
  midtermStatus: string;
  finalStatus: string;
};

export function teamFromJobTitle(jobTitle: string): string {
  const lower = jobTitle.toLowerCase();
  if (lower.includes("design") || lower.includes("ux")) return "Design";
  if (lower.includes("product") || lower.includes("business analyst")) return "Product";
  if (lower.includes("marketing") || lower.includes("content") || lower.includes("sales")) {
    return "Marketing";
  }
  if (lower.includes("data") || lower.includes("ml ")) return "Data";
  if (lower.includes("hr")) return "Operations";
  return "Engineering";
}

export const DEMO_STUDENTS: DemoStudentSeed[] = [
  { name: "Jane Doe", studentId: "20912834", jobTitle: "Software Engineering Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "John Smith", studentId: "20875412", jobTitle: "Product Management Intern", term: "Spring", year: "2026", midtermStatus: "in_progress", finalStatus: "not_started" },
  { name: "Alice Johnson", studentId: "21043928", jobTitle: "Frontend Developer", term: "Spring", year: "2026", midtermStatus: "ready_reconcile", finalStatus: "not_started" },
  { name: "Bob Williams", studentId: "20773950", jobTitle: "UX Research Intern", term: "Spring", year: "2026", midtermStatus: "finalized", finalStatus: "finalized" },
  { name: "Priya Sharma", studentId: "20930112", jobTitle: "Data Science Intern", term: "Spring", year: "2026", midtermStatus: "pending_hr", finalStatus: "not_started" },
  { name: "Liam O'Brien", studentId: "20891204", jobTitle: "Backend Developer", term: "Winter", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Sofia Martinez", studentId: "21055671", jobTitle: "Marketing Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Noah Kim", studentId: "20788433", jobTitle: "DevOps Intern", term: "Fall", year: "2025", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Emma Wilson", studentId: "20966720", jobTitle: "QA Engineering Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Ethan Brown", studentId: "20844109", jobTitle: "Mobile Developer", term: "Winter", year: "2026", midtermStatus: "in_progress", finalStatus: "not_started" },
  { name: "Mia Chen", studentId: "21011877", jobTitle: "Business Analyst Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Oliver Davis", studentId: "20750291", jobTitle: "Cloud Engineering Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Ava Thompson", studentId: "20988456", jobTitle: "Design Intern", term: "Fall", year: "2025", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Lucas Nguyen", studentId: "20833018", jobTitle: "Security Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Chloe Anderson", studentId: "21077203", jobTitle: "Content Strategy Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Henry Patel", studentId: "20799144", jobTitle: "ML Engineering Intern", term: "Winter", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Zoe Taylor", studentId: "20945562", jobTitle: "Sales Operations Intern", term: "Spring", year: "2026", midtermStatus: "in_progress", finalStatus: "not_started" },
  { name: "Jack Robinson", studentId: "20860987", jobTitle: "Platform Engineering Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Nina Kowalski", studentId: "21020341", jobTitle: "HR Analytics Intern", term: "Spring", year: "2026", midtermStatus: "not_started", finalStatus: "not_started" },
  { name: "Ryan Lee", studentId: "20711890", jobTitle: "Full Stack Intern", term: "Fall", year: "2025", midtermStatus: "not_started", finalStatus: "not_started" },
];
