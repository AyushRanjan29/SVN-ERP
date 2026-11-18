"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createExamination, deleteExamination, updateExamination, type ExaminationInput } from "@/app/exams/actions";

type Choice = { id: number; name: string };
type Examination = ExaminationInput & { id: number; created_at: string };
const stateOptions: ExaminationInput["status"][] = ["draft", "scheduled", "ongoing", "completed"];

export default function ExaminationAdmin({ years, classes, examinations }: { years: Choice[]; classes: Choice[]; examinations: Examination[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Examination | null>(null);
  const [form, setForm] = useState<ExaminationInput>({ academicYearId: years[0]?.id ?? 0, classId: 0, name: "", examType: "Unit Test", startDate: "", endDate: "", status: "draft" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const yearMap = useMemo(() => new Map(years.map((item) => [item.id, item.name])), [years]);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const examTypes = [...new Set(examinations.map((exam) => exam.examType))].sort();
  const filtered = examinations.filter((exam) =>
    (!search || `${exam.name} ${exam.examType}`.toLowerCase().includes(search.toLowerCase())) &&
    (!yearFilter || exam.academicYearId === Number(yearFilter)) &&
    (!classFilter || exam.classId === Number(classFilter)) &&
    (!typeFilter || exam.examType === typeFilter),
  );
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  function startEdit(exam: Examination) {
    setEdit(exam);
    setForm({ academicYearId: exam.academicYearId, classId: exam.classId, name: exam.name, examType: exam.examType, startDate: exam.startDate, endDate: exam.endDate, status: exam.status });
    setFeedback(""); setError("");
  }

  function resetForm() {
    setEdit(null);
    setForm({ academicYearId: years[0]?.id ?? 0, classId: 0, name: "", examType: "Unit Test", startDate: "", endDate: "", status: "draft" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setFeedback("");
    const result = edit ? await updateExamination(edit.id, form) : await createExamination(form);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setFeedback(edit ? "Examination updated." : "Examination created.");
    resetForm(); router.refresh();
  }

  async function remove(exam: Examination) {
    if (!window.confirm(`Delete “${exam.name}”? Its configured subjects and marks will also be deleted.`)) return;
    setError(""); setFeedback("");
    const result = await deleteExamination(exam.id);
    if (result.error) setError(result.error);
    else { setFeedback("Examination deleted."); if (edit?.id === exam.id) resetForm(); router.refresh(); }
  }

  return (
    <div className="space-y-7">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-lg font-semibold text-slate-900">{edit ? "Edit examination" : "Create examination"}</h2><p className="mt-1 text-sm text-slate-500">Configure the examination scope, schedule and status.</p></div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {feedback && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{feedback}</div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">Examination name<input className={inputClass} required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Annual Examination" /></label>
          <label className="text-sm font-medium text-slate-700">Type<input className={inputClass} required maxLength={80} list="exam-type-options" value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} placeholder="Unit Test" /><datalist id="exam-type-options"><option value="Unit Test" /><option value="Half-Yearly" /><option value="Annual Examination" />{examTypes.map((type) => <option key={type} value={type} />)}</datalist></label>
          <label className="text-sm font-medium text-slate-700">Academic year<select className={inputClass} required value={form.academicYearId || ""} onChange={(e) => setForm({ ...form, academicYearId: Number(e.target.value) })}><option value="">Select year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Class<select className={inputClass} required value={form.classId || ""} onChange={(e) => setForm({ ...form, classId: Number(e.target.value) })}><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Start date<input className={inputClass} type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
          <label className="text-sm font-medium text-slate-700">End date<input className={inputClass} type="date" required min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
          <label className="text-sm font-medium text-slate-700">Status<select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ExaminationInput["status"] })}>{stateOptions.map((state) => <option key={state} value={state}>{state[0].toUpperCase() + state.slice(1)}</option>)}</select></label>
          <div className="flex items-end gap-2"><button disabled={saving || !years.length || !classes.length} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving…" : edit ? "Save changes" : "Create examination"}</button>{edit && <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium">Cancel</button>}</div>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="text-lg font-semibold text-slate-900">Examinations</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input aria-label="Search examinations" className={inputClass} placeholder="Search name or type" value={search} onChange={(e) => setSearch(e.target.value)} /><select aria-label="Filter by academic year" className={inputClass} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option value="">All academic years</option>{years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by class" className={inputClass} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by type" className={inputClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">All types</option>{examTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
        {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Examination</th><th className="px-5 py-3">Academic year</th><th className="px-5 py-3">Class</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((exam) => <tr key={exam.id}><td className="px-5 py-4 font-semibold text-slate-900">{exam.name}</td><td className="px-5 py-4">{yearMap.get(exam.academicYearId) ?? "—"}</td><td className="px-5 py-4">{classMap.get(exam.classId) ?? "—"}</td><td className="px-5 py-4">{exam.examType}</td><td className="px-5 py-4 whitespace-nowrap">{exam.startDate} – {exam.endDate}</td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium capitalize text-indigo-700">{exam.status}</span></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => startEdit(exam)} className="text-sm font-medium text-indigo-700 hover:underline">Edit</button><Link href={`/admin/examinations/${exam.id}/subjects`} className="text-sm font-medium text-indigo-700 hover:underline">Subjects</Link><Link href={`/admin/examinations/${exam.id}/marks`} className="text-sm font-medium text-indigo-700 hover:underline">Marks</Link><Link href={`/admin/examinations/${exam.id}/reports`} className="text-sm font-medium text-indigo-700 hover:underline">Reports</Link><button type="button" onClick={() => void remove(exam)} className="text-sm font-medium text-rose-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-sm text-slate-500">No examinations match these filters.</div>}
      </section>
    </div>
  );
}
