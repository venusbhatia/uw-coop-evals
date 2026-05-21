export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready_reconcile: "Ready to reconcile",
  pending_hr: "Pending HR review",
  returned: "Returned for revision",
  pending_vp: "Pending VP review",
  finalized: "Finalized",
  drafting: "In progress",
  completed: "Finalized",
};

export function workflowStatusLabel(status: string): string {
  return WORKFLOW_STATUS_LABELS[status] ?? status;
}

export function canExportStatus(status: string): boolean {
  return status === "finalized" || status === "completed";
}

export function canEditForm(status: string, workflowStatus?: string): boolean {
  if (canExportStatus(status)) return false;
  if (status === "pending_hr" || status === "pending_vp") return false;
  if (workflowStatus === "pending_hr" || workflowStatus === "pending_vp" || workflowStatus === "finalized") {
    return false;
  }
  return true;
}
