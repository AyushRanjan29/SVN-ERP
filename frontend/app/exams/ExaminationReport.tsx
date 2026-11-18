"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExamResult } from "@/lib/exams/calculations";

type StudentResult = { enrollmentId: number; studentId: number; name: string; admissionNumber: string; rollNumber: number | null; sectionId: number; result: ExamResult };
type Subject = { id: number; subjectId: number; name: string; scopeSectionId: number | null; maximumMarks: number; passingMarks: number };
type Section = { id: number; name: string };
type Sort = "roll" | "name" | "percentage" | "marks";

export default function ExaminationReport({ examName, examType, className, yearName, subjects, students, sections, partial, cardBaseHref, backHref }: {
  examName: string; examType: string; className: string; yearName: string; subjects: Subject[]; students: StudentResult[]; sections: Section[]; partial: boolean; cardBaseHref: string; backHref: string;
}) {
  const [search, setSearch] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sort, setSort] = useState<Sort>("roll");
  const sectionMap = useMemo(() => new Map(sections.map((item) => [item.id, item.name])), [sections]);
  const filtered = students.filter((student) => (!sectionId || student.sectionId === Number(sectionId)) && (!search || `${student.name} ${student.admissionNumber} ${student.rollNumber ?? ""}`.toLowerCase().includes(search.toLowerCase())));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "percentage") return (b.result.percentage ?? -1) - (a.result.percentage ?? -1);
    if (sort === "marks") return (b.result.totalObtained ?? -1) - (a.result.totalObtained ?? -1);
    return (a.rollNumber ?? Number.MAX_SAFE_INTEGER) - (b.rollNumber ?? Number.MAX_SAFE_INTEGER);
  });
  const complete = filtered.filter((item) => item.result.isComplete);
  const passed = complete.filter((item) => item.result.result === "pass").length;
  const failed = complete.filter((item) => item.result.result === "fail").length;
  const incomplete = filtered.length - complete.length;
  const highest = complete.reduce<number | null>((value, item) => value === null ? item.result.totalObtained : Math.max(value, item.result.totalObtained ?? 0), null);
  const average = complete.length ? (complete.reduce((total, item) => total + (item.result.totalObtained ?? 0), 0) / complete.length).toFixed(2) : "—";
  const sectionStats = [...new Set(filtered.map((item) => item.sectionId))].map((id) => {
    const members = filtered.filter((item) => item.sectionId === id);
    const completeMembers = members.filter((item) => item.result.isComplete);
    return {
      id,
      name: sectionMap.get(id) ?? "—",
      students: members.length,
      complete: completeMembers.length,
      incomplete: members.length - completeMembers.length,
      passed: partial ? null : completeMembers.filter((item) => item.result.result === "pass").length,
      failed: partial ? null : completeMembers.filter((item) => item.result.result === "fail").length,
      average: !partial && completeMembers.length ? (completeMembers.reduce((sum, item) => sum + (item.result.percentage ?? 0), 0) / completeMembers.length).toFixed(2) : "—",
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const subjectStats = subjects.map((subject) => {
    const outcomes = filtered.flatMap((student) => student.result.subjects.filter((item) => item.subjectId === subject.subjectId));
    const marked = outcomes.filter((item) => item.status === "marked");
    return { subject, candidates: outcomes.length, marked: marked.length, absent: outcomes.filter((item) => item.status === "absent").length, missing: outcomes.filter((item) => item.status === "missing").length, passed: marked.filter((item) => item.passed).length, failed: marked.filter((item) => item.passed === false).length, highest: marked.reduce<number | null>((value, item) => value === null ? item.marksObtained : Math.max(value, item.marksObtained ?? 0), null), average: marked.length ? (marked.reduce((total, item) => total + (item.marksObtained ?? 0), 0) / marked.length).toFixed(2) : "—" };
  });

  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">{examType} · {yearName}</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{examName} results</h1><p className="mt-1 text-sm text-slate-500">{className} · {filtered.length} students in this report</p></div><Link href={backHref} className="text-sm font-medium text-indigo-600 hover:underline">Examinations</Link></header>
    {partial && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Teacher report contains only subjects and sections assigned to your account. Overall totals, pass/fail and grades are not final report-card results.</div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><ReportCard label="Students" value={filtered.length} /><ReportCard label="Complete" value={complete.length} /><ReportCard label="Incomplete" value={incomplete} /><ReportCard label="Pass" value={partial ? "—" : passed} /><ReportCard label="Fail" value={partial ? "—" : failed} /><ReportCard label="Highest total" value={partial ? "—" : highest ?? "—"} /><ReportCard label="Average total" value={partial ? "—" : average} /></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3 sm:p-5"><input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or admission number" aria-label="Search student" /><select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)} aria-label="Filter by section"><option value="">All assigned sections</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort report"><option value="roll">Sort by roll number</option><option value="name">Sort by name</option><option value="percentage">Sort by percentage</option><option value="marks">Sort by total marks</option></select></div>
      {sorted.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Maximum</th><th className="px-4 py-3">Percentage</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Report card</th></tr></thead><tbody className="divide-y divide-slate-100">{sorted.map((student) => <tr key={student.enrollmentId}><td className="px-4 py-3 font-medium text-slate-900">{student.name}<span className="block text-xs font-normal text-slate-500">{student.admissionNumber} · Roll {student.rollNumber ?? "—"}</span></td><td className="px-4 py-3">{sectionMap.get(student.sectionId) ?? "—"}</td><td className="px-4 py-3">{partial ? "—" : student.result.totalObtained ?? "—"}</td><td className="px-4 py-3">{partial ? "—" : student.result.totalMaximum ?? "—"}</td><td className="px-4 py-3">{partial || student.result.percentage === null ? "—" : `${student.result.percentage}%`}</td><td className="px-4 py-3">{partial ? "—" : student.result.grade ?? "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${student.result.result === "pass" ? "bg-emerald-50 text-emerald-700" : student.result.result === "fail" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{partial ? "assigned only" : student.result.result}</span></td><td className="px-4 py-3"><Link className="font-medium text-indigo-700 hover:underline" href={`${cardBaseHref}/${student.studentId}?section=${student.sectionId}`}>View</Link></td></tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-slate-500">No students match this report.</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:px-5"><h2 className="font-semibold text-slate-900">Subject-wise performance</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Max / Pass</th><th className="px-4 py-3">Marked</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">Incomplete</th><th className="px-4 py-3">Pass / Fail</th><th className="px-4 py-3">Highest</th><th className="px-4 py-3">Average</th></tr></thead><tbody className="divide-y divide-slate-100">{subjectStats.map((item) => <tr key={item.subject.id}><td className="px-4 py-3 font-medium">{item.subject.name}{item.subject.scopeSectionId !== null ? ` · ${sectionMap.get(item.subject.scopeSectionId) ?? "Section"}` : ""}</td><td className="px-4 py-3">{item.subject.maximumMarks} / {item.subject.passingMarks}</td><td className="px-4 py-3">{item.marked}</td><td className="px-4 py-3">{item.absent}</td><td className="px-4 py-3">{item.missing}</td><td className="px-4 py-3">{item.passed} / {item.failed}</td><td className="px-4 py-3">{item.highest ?? "—"}</td><td className="px-4 py-3">{item.average}</td></tr>)}</tbody></table></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:px-5"><h2 className="font-semibold text-slate-900">Section-wise performance</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Section</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Complete</th><th className="px-4 py-3">Incomplete</th><th className="px-4 py-3">Pass</th><th className="px-4 py-3">Fail</th><th className="px-4 py-3">Average %</th></tr></thead><tbody className="divide-y divide-slate-100">{sectionStats.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{item.students}</td><td className="px-4 py-3">{item.complete}</td><td className="px-4 py-3">{item.incomplete}</td><td className="px-4 py-3">{item.passed ?? "—"}</td><td className="px-4 py-3">{item.failed ?? "—"}</td><td className="px-4 py-3">{item.average}{item.average !== "—" ? "%" : ""}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function ReportCard({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>; }
