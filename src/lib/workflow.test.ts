import { describe, expect, it } from "vitest";
import {
  canSupervisorEdit,
  supervisorCanSaveEvaluation,
} from "../../convex/lib/workflow";

describe("canSupervisorEdit", () => {
  it("allows editable workflow states", () => {
    expect(canSupervisorEdit(undefined)).toBe(true);
    expect(canSupervisorEdit("draft")).toBe(true);
    expect(canSupervisorEdit("not_started")).toBe(true);
    expect(canSupervisorEdit("in_progress")).toBe(true);
    expect(canSupervisorEdit("returned")).toBe(true);
    expect(canSupervisorEdit("ready_reconcile")).toBe(true);
  });

  it("blocks review and finalized states", () => {
    expect(canSupervisorEdit("pending_hr")).toBe(false);
    expect(canSupervisorEdit("pending_vp")).toBe(false);
    expect(canSupervisorEdit("finalized")).toBe(false);
  });
});

describe("supervisorCanSaveEvaluation", () => {
  it("allows save when student status is ready_reconcile without reconciled row", () => {
    expect(supervisorCanSaveEvaluation("ready_reconcile", undefined)).toBe(true);
  });

  it("allows save when either student or reconciled workflow is editable", () => {
    expect(supervisorCanSaveEvaluation("pending_hr", "in_progress")).toBe(true);
    expect(supervisorCanSaveEvaluation("in_progress", "pending_hr")).toBe(true);
  });

  it("blocks when both are locked", () => {
    expect(supervisorCanSaveEvaluation("pending_hr", "pending_hr")).toBe(false);
    expect(supervisorCanSaveEvaluation("finalized", "finalized")).toBe(false);
  });
});
