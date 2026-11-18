"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveExamMarks, type ExamMarkInput } from "./actions";

export type MarksStudent = { enrollmentId: number; studentId: number; name: string; admissionNumber: string; rollNumber: number | null; marks: number | null; absent: boolean; remarks: string | null };
type Draft = { marks: string; absent: boolean; remarks: string; dirty: boolean };

export default function MarksEntry({ examinationId, examSubjectId, subjectName, maximumMarks, passingMarks, allowNegativeMarks, canEdit = true, students }: {
  examinationId: number; examSubjectId: number; subjectName: string; maximumMarks: number; passingMarks: number; allowNegativeMarks: boolean; canEdit?: boolean; students: MarksStudent[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => Object.fromEntries(students.map((student) => [student.enrollmentId, { marks: student.marks === null ? "" : String(student.marks), absent: student.absent, remarks: student.remarks ?? "", dirty: false }])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirtyStudents = students.filter((student) => drafts[student.enrollmentId]?.dirty);
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  function change(enrollmentId: number, changes: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [enrollmentId]: { ...current[enrollmentId], ...changes, dirty: true } }));
    setError(""); setMessage("");
  }

  async function save() {
    setError(""); setMessage("");
    const payload: ExamMarkInput[] = [];
    for (const student of dirtyStudents) {
      const draft = drafts[student.enrollmentId];
      const marks = draft.marks.trim() === "" ? null : Number(draft.marks);
      if (marks !== null && (!Number.isFinite(marks) || (!allowNegativeMarks && marks < 0) || marks > maximumMarks)) {
        setError(`Marks for ${student.name} must be ${allowNegativeMarks ? "at most" : "between zero and"} ${maximumMarks}.`);
        return;
      }
      payload.push({ examinationSubjectId: examSubjectId, enrollmentId: student.enrollmentId, marksObtained: draft.absent ? null : marks, isAbsent: draft.absent, remarks: draft.remarks });
    }
    if (!payload.length) { setError("Change at least one student mark before saving."); return; }
    setSaving(true);
    const result = await saveExamMarks(examinationId, payload);
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      setMessage(`Saved marks for ${payload.length} student${payload.length === 1 ? "" : "s"}.`);
      setDrafts((current) => Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, { ...draft, dirty: false }])));
      router.refresh();
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{subjectName}</h2><p className="mt-1 text-sm text-slate-500">Maximum {maximumMarks} · Passing {passingMarks}{allowNegativeMarks ? " · Negative marks enabled" : ""}</p></div><p className="text-xs text-slate-500">{students.length} active students</p></div></div>
    {error && <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{message && <div role="status" className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    {students.length ? <div className="divide-y divide-slate-100">{students.map((student) => { const draft = drafts[student.enrollmentId]; return <div key={student.enrollmentId} className="grid gap-3 p-4 sm:grid-cols-[minmax(180px,1fr)_150px_110px_minmax(160px,1fr)] sm:items-center sm:px-6"><div><p className="font-medium text-slate-900">{student.name}</p><p className="text-xs text-slate-500">Roll {student.rollNumber ?? "—"} · {student.admissionNumber}</p></div><label className="text-xs font-medium text-slate-500">Marks<input className={`${input} mt-1`} type="number" inputMode="decimal" step="0.01" min={allowNegativeMarks ? undefined : "0"} max={maximumMarks} disabled={!canEdit || draft.absent} value={draft.marks} onChange={(event) => change(student.enrollmentId, { marks: event.target.value })} placeholder="Not entered" /></label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" disabled={!canEdit} checked={draft.absent} onChange={(event) => change(student.enrollmentId, { absent: event.target.checked, marks: event.target.checked ? "" : draft.marks })} />Absent</label><label className="text-xs font-medium text-slate-500">Remarks<input className={`${input} mt-1`} disabled={!canEdit} value={draft.remarks} onChange={(event) => change(student.enrollmentId, { remarks: event.target.value })} maxLength={500} placeholder="Optional" /></label></div>; })}</div> : <p className="p-10 text-center text-sm text-slate-500">No active enrollments for this selection.</p>}
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-xs text-slate-500">{canEdit ? "Blank marks remain incomplete; absent is stored separately from zero." : "This examination is completed. Marks are read-only."}</p>{canEdit && <button type="button" disabled={saving || dirtyStudents.length === 0} onClick={() => void save()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : `Save changes${dirtyStudents.length ? ` (${dirtyStudents.length})` : ""}`}</button>}</div>
  </section>;
}
