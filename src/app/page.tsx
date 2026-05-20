"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

export default function Dashboard() {
  const students = useQuery(api.students.list);
  const seedDemo = useMutation(api.students.seedDemo);
  const addStudent = useMutation(api.students.add);

  const [searchTerm, setSearchTerm] = useState("");
  const [termFilter, setTermFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    studentId: "",
    jobTitle: "",
    term: "Spring",
    year: "2026",
  });

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.studentId || !newStudent.jobTitle) return;
    try {
      await addStudent(newStudent);
      setShowAddModal(false);
      setNewStudent({
        name: "",
        studentId: "",
        jobTitle: "",
        term: "Spring",
        year: "2026",
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add student");
    }
  };

  const filteredStudents =
    students?.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.includes(searchTerm) ||
        student.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTerm = termFilter === "all" || student.term === termFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" &&
          (student.midtermStatus === "completed" ||
            student.finalStatus === "completed")) ||
        (statusFilter === "ready_reconcile" &&
          (student.midtermStatus === "ready_reconcile" ||
            student.finalStatus === "ready_reconcile")) ||
        (statusFilter === "drafting" &&
          (student.midtermStatus === "drafting" ||
            student.finalStatus === "drafting")) ||
        (statusFilter === "not_started" &&
          student.midtermStatus === "not_started" &&
          student.finalStatus === "not_started");
      return matchesSearch && matchesTerm && matchesStatus;
    }) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">8090 Co-op Evals</h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Performance evaluations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSeed()}
            disabled={seeding}
            className="btn-secondary px-4 py-2 text-[13px] disabled:opacity-40"
          >
            {seeding ? "Seeding…" : "Seed demo"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 text-[13px] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add student
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full pl-10 pr-4 py-2.5 text-[14px]"
            />
          </div>
          <select
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="input-field px-3 py-2.5 text-[13px] sm:w-36"
          >
            <option value="all">All terms</option>
            <option value="Winter">Winter</option>
            <option value="Spring">Spring</option>
            <option value="Fall">Fall</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field px-3 py-2.5 text-[13px] sm:w-44"
          >
            <option value="all">All statuses</option>
            <option value="not_started">Not started</option>
            <option value="drafting">Drafting</option>
            <option value="ready_reconcile">Reconcile</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="panel overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[12px] text-[var(--muted)] uppercase tracking-wide">
                <th className="py-3 px-4 font-medium">Student</th>
                <th className="py-3 px-4 font-medium">Term</th>
                <th className="py-3 px-4 font-medium">Midterm</th>
                <th className="py-3 px-4 font-medium">Final</th>
                <th className="py-3 px-4 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {!students ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--muted)]">
                    Loading…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--muted)]">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[12px] text-[var(--muted)] mt-0.5">
                        {s.studentId} · {s.jobTitle}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[var(--muted)]">
                      {s.term} {s.year}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={s.midtermStatus} />
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={s.finalStatus} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/student/${s._id}`}
                        className="text-[13px] font-medium hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="panel w-full max-w-md p-6 shadow-xl">
            <h2 className="text-[17px] font-semibold">Add student</h2>
            <form onSubmit={(e) => void handleAddStudent(e)} className="mt-6 space-y-4">
              <div>
                <label className="text-[12px] text-[var(--muted)] uppercase tracking-wide">
                  Name
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, name: e.target.value })
                  }
                  className="input-field w-full mt-1.5 px-3 py-2 text-[14px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-[var(--muted)] uppercase tracking-wide">
                    ID
                  </label>
                  <input
                    type="text"
                    value={newStudent.studentId}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, studentId: e.target.value })
                    }
                    className="input-field w-full mt-1.5 px-3 py-2 text-[14px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[var(--muted)] uppercase tracking-wide">
                    Term
                  </label>
                  <div className="flex gap-2 mt-1.5">
                    <select
                      value={newStudent.term}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, term: e.target.value })
                      }
                      className="input-field flex-1 px-2 py-2 text-[13px]"
                    >
                      <option value="Winter">Winter</option>
                      <option value="Spring">Spring</option>
                      <option value="Fall">Fall</option>
                    </select>
                    <input
                      type="text"
                      value={newStudent.year}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, year: e.target.value })
                      }
                      className="input-field w-16 px-2 py-2 text-[14px]"
                      required
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[12px] text-[var(--muted)] uppercase tracking-wide">
                  Job title
                </label>
                <input
                  type="text"
                  value={newStudent.jobTitle}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, jobTitle: e.target.value })
                  }
                  className="input-field w-full mt-1.5 px-3 py-2 text-[14px]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary px-4 py-2 text-[13px]"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2 text-[13px]">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const label =
    status === "completed"
      ? "Completed"
      : status === "ready_reconcile"
        ? "Reconcile"
        : status === "drafting"
          ? "Drafting"
          : "Not started";

  const active =
    status === "completed" ||
    status === "ready_reconcile" ||
    status === "drafting";

  return (
    <span className={`badge ${active ? "badge-active" : ""}`}>{label}</span>
  );
}
