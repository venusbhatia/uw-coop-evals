export const WORKFLOW_STATUSES = [
  "not_started",
  "in_progress",
  "ready_reconcile",
  "pending_hr",
  "returned",
  "pending_vp",
  "finalized",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export function statusFieldForType(type: string): "midtermStatus" | "finalStatus" {
  return type === "midterm" ? "midtermStatus" : "finalStatus";
}

export function canSupervisorEdit(workflowStatus: string | undefined): boolean {
  if (!workflowStatus || workflowStatus === "draft") return true;
  return workflowStatus === "in_progress" || workflowStatus === "returned";
}

export function resolveWorkflowStatus(
  workflowStatus: string | undefined,
  legacyStatus?: string,
  studentTermStatus?: string,
): string {
  if (workflowStatus) return workflowStatus;
  if (studentTermStatus === "finalized" || studentTermStatus === "completed") {
    return "finalized";
  }
  if (legacyStatus === "completed") return "finalized";
  if (legacyStatus === "draft") return "in_progress";
  return studentTermStatus ?? "in_progress";
}

export function canExport(workflowStatus: string | undefined, studentTermStatus?: string): boolean {
  const resolved = resolveWorkflowStatus(workflowStatus, undefined, studentTermStatus);
  return resolved === "finalized" || studentTermStatus === "completed";
}

export function deriveStatusFromDrafts(
  draftCount: number,
  currentStatus: string,
): WorkflowStatus {
  if (currentStatus === "pending_hr" || currentStatus === "pending_vp" || currentStatus === "finalized" || currentStatus === "returned") {
    return currentStatus as WorkflowStatus;
  }
  if (draftCount >= 2) return "ready_reconcile";
  if (draftCount >= 1) return "in_progress";
  return currentStatus === "not_started" ? "not_started" : "in_progress";
}
