"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { deleteExaminationSubject, saveExaminationSubject } from "@/app/exams/actions";

type Offering = { subjectId: number; subjectName: string; sectionId: number | null; sectionName: string | null };
type ConfiguredSubject = { id: number; subject_id: number; section_id: number | null; maximum_marks: number; passing_marks: number; allow_negative_marks: boolean };
type Selection = { subjectId: number; sectionId: number | null };
const keyOf = (subjectId: number, sectionId: number | null) => `${subjectId}:${sectionId ?? "class"}`;

export default function SubjectConfiguration({ examinationId, examinationName, offerings, configured }: { examinationId: number; examinationName: string; offerings: Offering[]; configured: ConfiguredSubject[] }) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState("");
  const [max, setMax] = useState("100");
  const [pass, setPass] = useState("35");
  const [negative, setNegative] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const configuredKeys = new Set(configured.map((item) => keyOf(item.subject_id, item.section_id)));
  const available = offerings.filter((item) => !configuredKeys.has(keyOf(item.subjectId, item.sectionId)));
  const offeringMap = new Map(offerings.map((item) => [keyOf(item.subjectId, item.sectionId), item]));

  async function save(selection: Selection, maximumMarks: number, passingMarks: number, allowNegativeMarks: boolean) {
    setSaving(true); setError(""); setMessage("");
    const result = await saveExaminationSubject({ examinationId, subjectId: selection.subjectId, sectionId: selection.sectionId, maximumMarks, passingMarks, allowNegativeMarks });
    setSaving(false);
    if (result.error) setError(result.error);
    else { setMessage("Subject configuration saved."); setSelectedKey(""); router.refresh(); }
  }

  async function remove(config: ConfiguredSubject) {
    const item = offeringMap.get(keyOf(config.subject_id, config.section_id));
    if (!window.confirm(`Remove ${item?.subjectName ?? "this subject"}${item?.sectionName ? ` for ${item.sectionName}` : " for the whole class"} and its recorded marks?`)) return;
    setError(""); setMessage("");
    const result = await deleteExaminationSubject(config.id, examinationId);
    if (result.error) setError(result.error);
    else { setMessage("Subject removed."); router.refresh(); }
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const offering = offeringMap.get(selectedKey);
    if (offering) void save({ subjectId: offering.subjectId, sectionId: offering.sectionId }, Number(max), Number(pass), negative);
  }

  return <div className="mx-auto max-w-5xl space-y-6"><div><Link href="/admin/examinations" className="text-sm font-medium text-indigo-600 hover:underline">← Examinations</Link><h1 className="mt-3 text-2xl font-bold text-slate-950">Configure subjects</h1><p className="mt-1 text-sm text-slate-500">{examinationName}</p></div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    <form onSubmit={add} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:col-span-2">Class subject / section<select className={`${input} mt-1 w-full`} required value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}><option value="">Select subject offering</option>{available.map((item) => <option key={keyOf(item.subjectId, item.sectionId)} value={keyOf(item.subjectId, item.sectionId)}>{item.subjectName}{item.sectionName ? ` · ${item.sectionName}` : " · Whole class"}</option>)}</select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maximum marks<input className={`${input} mt-1 w-full`} required type="number" min="0.01" step="0.01" value={max} onChange={(event) => setMax(event.target.value)} /></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passing marks<input className={`${input} mt-1 w-full`} required type="number" min="0" step="0.01" value={pass} onChange={(event) => setPass(event.target.value)} /></label>
      <div className="flex items-end gap-2"><label className="flex flex-1 items-center gap-2 pb-2 text-xs text-slate-600"><input type="checkbox" checked={negative} onChange={(event) => setNegative(event.target.checked)} />Allow negative</label><button disabled={saving || !available.length} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add"}</button></div>
    </form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Configured subjects</h2></div>{configured.length ? <div className="divide-y divide-slate-100">{configured.map((item) => <SubjectRow key={item.id} config={item} offering={offeringMap.get(keyOf(item.subject_id, item.section_id))} saving={saving} onSave={save} onRemove={remove} input={input} />)}</div> : <p className="p-8 text-center text-sm text-slate-500">No subjects configured yet.</p>}</section>
  </div>;
}

function SubjectRow({ config, offering, saving, onSave, onRemove, input }: { config: ConfiguredSubject; offering?: Offering; saving: boolean; onSave: (selection: Selection, maximum: number, passing: number, negative: boolean) => Promise<void>; onRemove: (config: ConfiguredSubject) => Promise<void>; input: string }) {
  const [maximum, setMaximum] = useState(String(config.maximum_marks));
  const [passing, setPassing] = useState(String(config.passing_marks));
  const [negative, setNegative] = useState(config.allow_negative_marks);
  return <form onSubmit={(event) => { event.preventDefault(); void onSave({ subjectId: config.subject_id, sectionId: config.section_id }, Number(maximum), Number(passing), negative); }} className="grid gap-3 p-4 sm:grid-cols-[minmax(150px,1fr)_130px_130px_auto_auto] sm:items-center sm:p-5"><div><p className="font-medium text-slate-900">{offering?.subjectName ?? `Subject ${config.subject_id}`}{offering?.sectionName ? ` · ${offering.sectionName}` : " · Whole class"}</p><p className="text-xs text-slate-500">Exam subject #{config.id}</p></div><label className="text-xs text-slate-500">Max marks<input className={`${input} mt-1 w-full`} type="number" min="0.01" step="0.01" value={maximum} onChange={(event) => setMaximum(event.target.value)} /></label><label className="text-xs text-slate-500">Passing marks<input className={`${input} mt-1 w-full`} type="number" min="0" step="0.01" value={passing} onChange={(event) => setPassing(event.target.value)} /></label><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={negative} onChange={(event) => setNegative(event.target.checked)} />Negative</label><div className="flex gap-3"><button disabled={saving} className="text-sm font-semibold text-indigo-700 disabled:opacity-50">Save</button><button type="button" onClick={() => void onRemove(config)} className="text-sm font-semibold text-rose-700">Remove</button></div></form>;
}
