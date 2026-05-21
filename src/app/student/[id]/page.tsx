"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getEvaluatorEmail } from "@/lib/evaluatorSession";
import { fetchServerSessionEmail } from "@/lib/evaluatorApi";
import { 
  ArrowLeft, FileText, Download, ShieldAlert, Sparkles, 
  Check, Lock, Edit3, UserCheck, CheckSquare, Square, FileJson
} from "lucide-react";
import { downloadJsonFile } from "@/lib/waterlooFormExport";
import { COMPETENCY_LABELS, FUTURE_READY_COMPETENCIES, SDG_LIST } from "@/lib/evaluationConfig";
import {
  canExportStatus,
  canEditForm,
  workflowStatusLabel,
} from "@/lib/workflowLabels";

function evaluatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const studentData = useQuery(api.students.get, { studentId: id as any });
  const submitReconciliation = useMutation(api.evaluations.submitReconciliation);
  const signOffEvaluation = useMutation(api.evaluations.signOff);

  const [evalType, setEvalType] = useState<"midterm" | "final">("midterm");
  const [reconciledDraft, setReconciledDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [evaluatorEmail, setEvaluatorEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const serverEmail = await fetchServerSessionEmail();
        if (!serverEmail) {
          router.replace("/onboarding");
          return;
        }
        setEvaluatorEmail(serverEmail);
      } catch {
        router.replace("/onboarding");
      }
    })();
  }, [router]);

  const student = studentData?.student;
  const drafts = studentData?.drafts?.filter(d => d.type === evalType) || [];
  const reconciled = studentData?.reconciled?.find(r => r.type === evalType);

  const myDraft = evaluatorEmail
    ? drafts.find((d) => d.evaluatorName === evaluatorEmail)
    : undefined;
  const otherDrafts = evaluatorEmail
    ? drafts.filter((d) => d.evaluatorName !== evaluatorEmail)
    : drafts;

  const draftA = drafts[0];
  const draftB = drafts[1];
  const labelA = draftA ? evaluatorLabel(draftA.evaluatorName) : "—";
  const labelB = draftB ? evaluatorLabel(draftB.evaluatorName) : "—";

  const evalChatHref =
    student && evaluatorEmail
      ? `/chat/new?studentId=${student._id}&evaluator=${encodeURIComponent(evaluatorEmail)}&type=${evalType}`
      : "#";

  const termStatus =
    evalType === "midterm" ? student?.midtermStatus : student?.finalStatus;
  const isFinalized = termStatus ? canExportStatus(termStatus) : false;
  const showReconcile =
    termStatus === "ready_reconcile" && drafts.length >= 2;
  const formHref = student
    ? `/student/${student._id}/form?type=${evalType}`
    : "#";
  const latestRevision = reconciled?.revisionHistory?.slice(-1)[0];

  // Pre-populate reconciliation draft from database or calculate default consensus
  useEffect(() => {
    if (reconciled) {
      setReconciledDraft({ ...reconciled });
    } else if (drafts.length >= 2) {
      // Build a default consensus based on Evaluator 1 (or average of E1 & E2)
      const d1 = drafts[0];
      const d2 = drafts[1] || d1;
      
      const consensusRatings: any = {};
      Object.keys(d1.ratings).forEach((key) => {
        const val1 = (d1.ratings as any)[key] as number;
        const val2 = (d2.ratings as any)[key] as number;
        // Default to higher rating or average
        consensusRatings[key] = Math.round((val1 + val2) / 2);
      });

      // Merge SDGs
      const consensusSdgs = Array.from(new Set([...d1.sdgs, ...d2.sdgs])).sort((a, b) => a - b);

      // Merge Strengths selections
      const consensusStrengthsSelections = Array.from(new Set([...d1.strengths.selections, ...d2.strengths.selections])).slice(0, 3);
      // Merge Development selections
      const consensusDevSelections = Array.from(new Set([...d1.developments.selections, ...d2.developments.selections])).slice(0, 3);

      setReconciledDraft({
        ratings: consensusRatings,
        strengths: {
          selections: consensusStrengthsSelections,
          comments: d1.strengths.comments + (d2 && d2 !== d1 ? `\n\n[Alternative View]: ${d2.strengths.comments}` : ""),
        },
        developments: {
          selections: consensusDevSelections,
          comments: d1.developments.comments + (d2 && d2 !== d1 ? `\n\n[Alternative View]: ${d2.developments.comments}` : ""),
        },
        sdgs: consensusSdgs,
        overallRating: d1.overallRating,
        overallComments: d1.overallComments + (d2 && d2 !== d1 ? `\n\n[Alternative View]: ${d2.overallComments}` : ""),
        outstandingComments: d1.outstandingComments || (d2 ? d2.outstandingComments : ""),
        recommendations: d1.recommendations || (d2 ? d2.recommendations : ""),
        reviewedWithStudent: d1.reviewedWithStudent || (d2 ? d2.reviewedWithStudent : false),
        studentComments: d1.studentComments || (d2 ? d2.studentComments : ""),
        futureEmployment: {
          returnTerm: d1.futureEmployment.returnTerm,
          offeredReemployment: d1.futureEmployment.offeredReemployment,
          response: d1.futureEmployment.response,
          datesFrom: d1.futureEmployment.datesFrom,
          datesTo: d1.futureEmployment.datesTo,
        }
      });
    } else {
      setReconciledDraft(null);
    }
  }, [studentData, evalType]);

  if (studentData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (studentData === null || !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[var(--muted)]">
        <p>Student not found.</p>
        <Link href="/" className="btn-primary px-4 py-2 text-[13px]">
          Back
        </Link>
      </div>
    );
  }

  const handleSaveConsensus = async () => {
    if (!reconciledDraft) return;
    setSaving(true);
    try {
      await submitReconciliation({
        studentId: student._id,
        type: evalType,
        ...reconciledDraft,
      });
      setBanner({ type: "ok", text: "Consensus evaluation saved." });
    } catch (e: unknown) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOff = async () => {
    if (!reconciledDraft) return;
    setSigningOff(true);
    try {
      // First save current values
      await submitReconciliation({
        studentId: student._id,
        type: evalType,
        ...reconciledDraft,
      });
      // Sign off
      await signOffEvaluation({
        studentId: student._id,
        type: evalType,
      });
      setBanner({ type: "ok", text: "Sign-off recorded." });
    } catch (e: unknown) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Sign-off failed.",
      });
    } finally {
      setSigningOff(false);
    }
  };

  const handleRatingChange = (key: string, value: number) => {
    if (isFinalized || !reconciledDraft) return;
    setReconciledDraft({
      ...reconciledDraft,
      ratings: {
        ...reconciledDraft.ratings,
        [key]: value
      }
    });
  };

  const toggleSdg = (sdgNum: number) => {
    if (isFinalized || !reconciledDraft) return;
    const current = reconciledDraft.sdgs || [];
    const next = current.includes(sdgNum)
      ? current.filter((n: number) => n !== sdgNum)
      : [...current, sdgNum].sort((a, b) => a - b);
    setReconciledDraft({ ...reconciledDraft, sdgs: next });
  };

  const toggleStrength = (name: string) => {
    if (isFinalized || !reconciledDraft) return;
    const current = reconciledDraft.strengths.selections || [];
    const next = current.includes(name)
      ? current.filter((s: string) => s !== name)
      : current.length < 3 ? [...current, name] : current;
    setReconciledDraft({
      ...reconciledDraft,
      strengths: { ...reconciledDraft.strengths, selections: next }
    });
  };

  const handleExportJson = async () => {
    if (!student) return;
    try {
      const params = new URLSearchParams({
        studentId: student._id,
        type: evalType,
      });
      const res = await fetch(`/api/evaluations/waterloo-json?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        alert((data.error as string) ?? "Export failed.");
        return;
      }
      const safeName = student.name.replace(/\s+/g, "-").toLowerCase();
      downloadJsonFile(data, `${safeName}-${evalType}-waterloo-spe.json`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Export failed.");
    }
  };

  const toggleDevelopment = (name: string) => {
    if (isFinalized || !reconciledDraft) return;
    const current = reconciledDraft.developments.selections || [];
    const next = current.includes(name)
      ? current.filter((s: string) => s !== name)
      : current.length < 3 ? [...current, name] : current;
    setReconciledDraft({
      ...reconciledDraft,
      developments: { ...reconciledDraft.developments, selections: next }
    });
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-[var(--surface)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight">{student.name}</h1>
            <p className="text-[13px] text-[var(--muted)]">
              {student.studentId} · {student.jobTitle}
            </p>
            {evaluatorEmail && (
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                Evaluating as {evaluatorEmail}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-[var(--border)] p-0.5">
            <button
              type="button"
              onClick={() => setEvalType("midterm")}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                evalType === "midterm"
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted)]"
              }`}
            >
              Midterm
            </button>
            <button
              type="button"
              onClick={() => setEvalType("final")}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                evalType === "final"
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted)]"
              }`}
            >
              Final
            </button>
          </div>

          {isFinalized && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleExportJson()}
                className="btn-secondary px-4 py-2 text-[13px] flex items-center gap-1.5"
              >
                <FileJson className="w-4 h-4" />
                Export JSON
              </button>
              <a
                href={`/api/evaluations/pdf?studentId=${student._id}&type=${evalType}`}
                className="btn-secondary px-4 py-2 text-[13px] flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                PDF
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Status & Chat Triggers (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Status Box */}
          <div className="panel p-6">
            <h3 className="text-[12px] text-[var(--muted)] uppercase tracking-wide mb-4">Status</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-400">Current Phase:</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--surface)] border border-[var(--border)]">
                {termStatus ? workflowStatusLabel(termStatus) : "—"}
              </span>
            </div>

            {banner && (
              <p
                className={`text-xs rounded-lg p-3 mb-4 ${
                  banner.type === "ok"
                    ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                    : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                }`}
              >
                {banner.text}
              </p>
            )}

            {termStatus === "returned" && latestRevision && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 rounded-lg text-xs mb-4">
                <p className="font-semibold">Returned for revision ({latestRevision.fromRole})</p>
                <p className="mt-1 text-[var(--muted)]">{latestRevision.comments}</p>
              </div>
            )}

            {isFinalized && reconciled && (
              <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg flex items-start gap-2.5 mb-4">
                <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-300">
                  Finalized — ready for WaterlooWorks export.
                  {reconciled.signOffs.length > 0 && (
                    <div className="font-semibold mt-1 text-slate-200">
                      Signed off: {reconciled.signOffs.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showReconcile && !isFinalized && (
              <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg flex items-start gap-2.5 mb-4">
                <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-amber-300">
                  Multiple drafts completed. Review the discrepancies highlighted in red and establish a reconciled consensus below.
                </div>
              </div>
            )}
          </div>

          {/* Your evaluation */}
          <div className="panel p-6">
            <h3 className="text-[12px] text-[var(--muted)] uppercase tracking-wide mb-4">
              Your evaluation
            </h3>
            {evaluatorEmail ? (
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="mb-2">
                  <span className="text-[13px] font-medium">{evaluatorEmail}</span>
                </div>
                {myDraft ? (
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Draft complete
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={formHref}
                      className="w-full text-center py-2 rounded-full btn-primary text-[13px] font-medium"
                    >
                      Open evaluation form
                    </Link>
                    <Link
                      href={evalChatHref}
                      className="w-full text-center py-2 rounded-full border border-[var(--border)] text-[13px]"
                    >
                      Optional: AI assistant
                    </Link>
                  </div>
                )}
                {myDraft && canEditForm(termStatus ?? "", reconciled?.workflowStatus) && (
                  <Link
                    href={formHref}
                    className="mt-3 block text-center text-[13px] underline text-[var(--muted)]"
                  >
                    Review in full form
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--muted)]">Loading…</p>
            )}

            {otherDrafts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
                  Other evaluators
                </p>
                {otherDrafts.map((d) => (
                  <div
                    key={d._id}
                    className="text-[12px] text-[var(--muted)] flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    {d.evaluatorName}
                  </div>
                ))}
              </div>
            )}
          </div>

          {showReconcile && !isFinalized && reconciledDraft && evaluatorEmail && (
            <div className="panel p-6">
              <h3 className="text-[12px] text-[var(--muted)] uppercase tracking-wide mb-3">
                Sign-off
              </h3>
              <p className="text-[13px] text-[var(--muted)]">{evaluatorEmail}</p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Reconciliation Panel (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Reconciliation Box */}
          <div className="panel p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div>
                <h3 className="font-bold text-lg">Consensus Reconciliation</h3>
                <p className="text-xs text-slate-400">Review evaluations side-by-side. Save and sign off once finalized.</p>
              </div>
              
              {showReconcile && !isFinalized && reconciledDraft && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveConsensus}
                    disabled={saving}
                    className="btn-secondary px-4 py-2 text-[13px] disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={handleSignOff}
                    disabled={signingOff}
                    className="btn-primary px-4 py-2 text-[13px] flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {signingOff ? "Signing..." : "Sign-Off & Lock"}
                  </button>
                </div>
              )}
            </div>

            {!reconciledDraft ? (
              <div className="py-16 text-center text-slate-500">
                <Sparkles className="w-8 h-8 text-indigo-500/40 mx-auto mb-3 animate-pulse" />
                No evaluator data yet. Complete an evaluation to generate ratings.
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* 20 Competency Grid */}
                <div>
                  <h4 className="font-bold text-xs text-indigo-400 uppercase tracking-wider mb-4">1. Competency Ratings</h4>
                  
                  <div className="border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/80">
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-12 bg-slate-900/40 py-2 px-4 text-[10px] text-slate-400 font-bold uppercase">
                      <div className="col-span-6">Competency</div>
                      <div className="col-span-2 text-center">{labelA}</div>
                      <div className="col-span-2 text-center">{labelB}</div>
                      <div className="col-span-2 text-center">Consensus</div>
                    </div>

                    {/* Competency Rows */}
                    {Object.keys(COMPETENCY_LABELS).map((key) => {
                      const labelInfo = COMPETENCY_LABELS[key];
                      const valA = (draftA?.ratings as Record<string, number>)?.[key] ?? "-";
                      const valB = (draftB?.ratings as Record<string, number>)?.[key] ?? "-";
                      const valConsensus = (reconciledDraft.ratings as any)[key] ?? 0;

                      const isConflict =
                        typeof valA === "number" &&
                        typeof valB === "number" &&
                        Math.abs(valA - valB) >= 2;

                      return (
                        <div 
                          key={key} 
                          className={`grid grid-cols-12 py-3 px-4 items-center text-xs transition-colors ${
                            isConflict && !isFinalized ? "bg-rose-950/20 hover:bg-rose-950/30" : "hover:bg-slate-900/10"
                          }`}
                        >
                          <div className="col-span-6 pr-4">
                            <span className="font-medium text-slate-200">{labelInfo.label}</span>
                            <span className="block text-[9px] text-slate-500 font-medium uppercase mt-0.5">{labelInfo.cat}</span>
                          </div>
                          
                          <div className="col-span-2 text-center text-slate-400 font-medium">
                            {valA === 0 ? "N/O" : valA}
                          </div>
                          
                          <div className="col-span-2 text-center text-slate-400 font-medium">
                            {valB === 0 ? "N/O" : valB}
                          </div>
                          
                          <div className="col-span-2 flex justify-center">
                            {isFinalized ? (
                              <span className="font-bold text-indigo-400">{valConsensus === 0 ? "N/O" : valConsensus}</span>
                            ) : (
                              <select
                                value={valConsensus}
                                onChange={(e) => handleRatingChange(key, parseInt(e.target.value))}
                                className={`py-1 px-1.5 bg-slate-900 border rounded text-xs focus:outline-none cursor-pointer ${
                                  isConflict ? "border-rose-500/60 text-rose-300 font-bold" : "border-slate-800 text-slate-200"
                                }`}
                              >
                                <option value={0}>N/O (Not Observed)</option>
                                <option value={1}>1 (Poor)</option>
                                <option value={2}>2 (Developing)</option>
                                <option value={3}>3 (Good)</option>
                                <option value={4}>4 (Strong)</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 3 Strengths & Development selections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/80">
                    <h5 className="font-bold text-xs text-emerald-400 uppercase tracking-wider mb-3">Top 3 Strengths</h5>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {FUTURE_READY_COMPETENCIES.map(comp => {
                        const isSelected = reconciledDraft.strengths?.selections?.includes(comp);
                        return (
                          <button
                            key={comp}
                            onClick={() => toggleStrength(comp)}
                            disabled={isFinalized}
                            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-emerald-500 text-emerald-950 font-bold" 
                                : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                            }`}
                          >
                            {comp}
                          </button>
                        );
                      })}
                    </div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Strengths Comments</label>
                    <textarea
                      value={reconciledDraft.strengths.comments}
                      onChange={(e) => setReconciledDraft({
                        ...reconciledDraft,
                        strengths: { ...reconciledDraft.strengths, comments: e.target.value }
                      })}
                      readOnly={isFinalized}
                      rows={3}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  {/* Developments */}
                  <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/80">
                    <h5 className="font-bold text-xs text-amber-500 uppercase tracking-wider mb-3">Top 3 Development Areas</h5>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {FUTURE_READY_COMPETENCIES.map(comp => {
                        const isSelected = reconciledDraft.developments?.selections?.includes(comp);
                        return (
                          <button
                            key={comp}
                            onClick={() => toggleDevelopment(comp)}
                            disabled={isFinalized}
                            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-amber-500 text-amber-950 font-bold" 
                                : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                            }`}
                          >
                            {comp}
                          </button>
                        );
                      })}
                    </div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Development Comments</label>
                    <textarea
                      value={reconciledDraft.developments.comments}
                      onChange={(e) => setReconciledDraft({
                        ...reconciledDraft,
                        developments: { ...reconciledDraft.developments, comments: e.target.value }
                      })}
                      readOnly={isFinalized}
                      rows={3}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* UN SDGs */}
                <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/80">
                  <h5 className="font-bold text-xs text-indigo-400 uppercase tracking-wider mb-3">UN Sustainable Development Goals (SDGs)</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SDG_LIST.map((sdgName, index) => {
                      const num = index + 1;
                      const isSelected = reconciledDraft.sdgs?.includes(num);
                      return (
                        <button
                          key={sdgName}
                          onClick={() => toggleSdg(num)}
                          disabled={isFinalized}
                          className="flex items-center gap-2 p-1.5 rounded bg-slate-900 hover:bg-slate-850/60 text-left border border-slate-800 transition-all cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          )}
                          <span className="text-[10px] text-slate-300 leading-tight truncate">{num}. {sdgName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Performance Rating */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Overall Performance Rating</label>
                    {isFinalized ? (
                      <div className="py-2 text-sm font-bold text-indigo-400 uppercase">{reconciledDraft.overallRating}</div>
                    ) : (
                      <select
                        value={reconciledDraft.overallRating}
                        onChange={(e) => setReconciledDraft({ ...reconciledDraft, overallRating: e.target.value })}
                        className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                      >
                        <option value="outstanding">Outstanding</option>
                        <option value="excellent">Excellent</option>
                        <option value="very_good">Very Good</option>
                        <option value="good">Good</option>
                        <option value="satisfactory">Satisfactory</option>
                        <option value="marginal">Marginal</option>
                        <option value="unsatisfactory">Unsatisfactory</option>
                      </select>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Outstanding Comments (Required if Outstanding)</label>
                    <textarea
                      value={reconciledDraft.outstandingComments}
                      onChange={(e) => setReconciledDraft({ ...reconciledDraft, outstandingComments: e.target.value })}
                      readOnly={isFinalized}
                      rows={2}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                      placeholder="Detail outstanding contributions..."
                    />
                  </div>
                </div>

                {/* Comments Textareas */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Supervisor's Comments on Overall Job Performance</label>
                    <textarea
                      value={reconciledDraft.overallComments}
                      onChange={(e) => setReconciledDraft({ ...reconciledDraft, overallComments: e.target.value })}
                      readOnly={isFinalized}
                      rows={3}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Recommendations for personal/professional development</label>
                    <textarea
                      value={reconciledDraft.recommendations}
                      onChange={(e) => setReconciledDraft({ ...reconciledDraft, recommendations: e.target.value })}
                      readOnly={isFinalized}
                      rows={2}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Future Employment Potential */}
                <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/80">
                  <h5 className="font-bold text-xs text-indigo-400 uppercase tracking-wider mb-4">Future Employment Potential</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1.5">Return Student?</label>
                      {isFinalized ? (
                        <div className="font-semibold text-slate-200 uppercase">{reconciledDraft.futureEmployment.returnTerm}</div>
                      ) : (
                        <select
                          value={reconciledDraft.futureEmployment.returnTerm}
                          onChange={(e) => setReconciledDraft({
                            ...reconciledDraft,
                            futureEmployment: { ...reconciledDraft.futureEmployment, returnTerm: e.target.value }
                          })}
                          className="w-full py-1.5 px-2 bg-slate-900 border border-slate-800 rounded text-slate-200"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1.5">Offered Re-employment?</label>
                      {isFinalized ? (
                        <div className="font-semibold text-slate-200 uppercase">{reconciledDraft.futureEmployment.offeredReemployment}</div>
                      ) : (
                        <select
                          value={reconciledDraft.futureEmployment.offeredReemployment}
                          onChange={(e) => setReconciledDraft({
                            ...reconciledDraft,
                            futureEmployment: { ...reconciledDraft.futureEmployment, offeredReemployment: e.target.value }
                          })}
                          className="w-full py-1.5 px-2 bg-slate-900 border border-slate-800 rounded text-slate-200"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="to_be_determined">To be determined</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1.5">Student Response</label>
                      {isFinalized ? (
                        <div className="font-semibold text-slate-200 uppercase">{reconciledDraft.futureEmployment.response}</div>
                      ) : (
                        <select
                          value={reconciledDraft.futureEmployment.response}
                          onChange={(e) => setReconciledDraft({
                            ...reconciledDraft,
                            futureEmployment: { ...reconciledDraft.futureEmployment, response: e.target.value }
                          })}
                          className="w-full py-1.5 px-2 bg-slate-900 border border-slate-800 rounded text-slate-200"
                        >
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                          <option value="is_undecided">Is Undecided</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
