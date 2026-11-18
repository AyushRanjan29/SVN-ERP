"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Choice = { id: number; name: string };
type SectionChoice = Choice & { class_id: number };
type AssignmentChoice = { class_id: number; section_id: number; academic_year_id: number };
type Enrollment = { id: number; student_id: number; class_id: number; section_id: number; academic_year_id: number; roll_number: number | null };
type Student = { id: number; admission_number: string; first_name: string; last_name: string | null };
type Status = "present" | "absent" | "late" | "leave" | "half_day";
type AttendanceRow = {
  id: number; enrollment_id: number; attendance_date: string; status: Status; remarks: string | null;
  student: Student; roll_number: number | null; class_id: number; section_id: number; academic_year_id: number;
};

const statusOptions: { value: Status; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  { value: "absent", label: "Absent", color: "text-rose-700 bg-rose-50 border-rose-100" },
  { value: "late", label: "Late", color: "text-amber-700 bg-amber-50 border-amber-100" },
  { value: "leave", label: "Leave", color: "text-sky-700 bg-sky-50 border-sky-100" },
  { value: "half_day", label: "Half Day", color: "text-violet-700 bg-violet-50 border-violet-100" },
];
const PAGE_SIZE = 50;
const FETCH_SIZE = 500;
const IN_BATCH_SIZE = 100;

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AttendanceHistory({
  role, years, classes, sections, assignments,
}: {
  role: "admin" | "teacher";
  years: (Choice & { is_active?: boolean })[];
  classes: Choice[];
  sections: SectionChoice[];
  assignments: AssignmentChoice[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const initialYear = years.find((year) => year.is_active) ?? years[0];
  const [yearId, setYearId] = useState(initialYear ? String(initialYear.id) : "");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState(() => localDateValue(new Date()));
  const [endDate, setEndDate] = useState(() => localDateValue(new Date()));
  const [status, setStatus] = useState<"" | Status>("");
  const [studentOptions, setStudentOptions] = useState<{ id: number; label: string; roll: number | null }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(Boolean(initialYear));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const searchGeneration = useRef(0);

  const allowedClasses = useMemo(() => role === "admin" ? classes : classes.filter((item) => assignments.some((a) => a.class_id === item.id && (!yearId || a.academic_year_id === Number(yearId)))), [role, classes, assignments, yearId]);
  const allowedSections = useMemo(() => sections.filter((item) => (!classId || item.class_id === Number(classId)) && (role === "admin" || assignments.some((a) => a.section_id === item.id && (!yearId || a.academic_year_id === Number(yearId)) && (!classId || a.class_id === Number(classId))))), [role, sections, assignments, yearId, classId]);

  async function fetchEnrollments(year: number, cls: string, section: string, student: string) {
    const results: Enrollment[] = [];
    for (let from = 0; ; from += FETCH_SIZE) {
      let query = supabase.from("enrollments")
        .select("id, student_id, class_id, section_id, academic_year_id, roll_number")
        .eq("academic_year_id", year)
        .order("id", { ascending: true })
        .range(from, from + FETCH_SIZE - 1);
      if (cls) query = query.eq("class_id", Number(cls));
      if (section) query = query.eq("section_id", Number(section));
      if (student) query = query.eq("student_id", Number(student));
      const { data, error: queryError } = await query;
      if (queryError) throw new Error(queryError.message);
      const batch = (data ?? []) as Enrollment[];
      results.push(...batch);
      if (batch.length < FETCH_SIZE) return results;
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!yearId) return () => { cancelled = true; };
    async function loadStudentOptions() {
      try {
        const enrollments = await fetchEnrollments(Number(yearId), classId, sectionId, "");
        const studentIds = [...new Set(enrollments.map((item) => item.student_id))];
        const studentMap = new Map<number, Student>();
        for (let index = 0; index < studentIds.length; index += IN_BATCH_SIZE) {
          const { data, error: studentError } = await supabase.from("students")
            .select("id, admission_number, first_name, last_name")
            .in("id", studentIds.slice(index, index + IN_BATCH_SIZE));
          if (studentError) throw new Error(studentError.message);
          for (const student of (data ?? []) as Student[]) studentMap.set(student.id, student);
        }
        const options = enrollments.flatMap((enrollment) => {
          const student = studentMap.get(enrollment.student_id);
          return student ? [{
            id: student.id,
            label: `${student.first_name} ${student.last_name ?? ""} · ${student.admission_number}`.trim(),
            roll: enrollment.roll_number,
          }] : [];
        });
        const uniqueOptions = [...new Map(options.map((option) => [option.id, option])).values()]
          .sort((a, b) => a.label.localeCompare(b.label));
        if (!cancelled) setStudentOptions(uniqueOptions);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load students for this filter.");
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }
    void loadStudentOptions();
    return () => { cancelled = true; };
  // fetchEnrollments closes over the stable memoized Supabase client.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, yearId, classId, sectionId]);

  function clearResults() {
    searchGeneration.current += 1;
    setLoading(false);
    setRows([]);
    setRosterCount(0);
    setHasSearched(false);
    setPage(0);
    setError("");
  }

  async function search() {
    setError("");
    if (!yearId) { setError("Choose an academic year."); return; }
    if (!startDate || !endDate) { setError("Choose both a start date and an end date."); return; }
    if (endDate < startDate) { setError("End date cannot be earlier than start date."); return; }
    if (sectionId && !classId) { setError("Choose a class before selecting a section."); return; }
    if (role === "teacher" && classId && sectionId && !assignments.some((a) => a.academic_year_id === Number(yearId) && a.class_id === Number(classId) && a.section_id === Number(sectionId))) {
      setError("This class and section are not assigned to your account."); return;
    }
    setLoading(true);
    setRows([]);
    setRosterCount(0);
    setHasSearched(false);
    setPage(0);
    const requestGeneration = ++searchGeneration.current;
    try {
      const enrollments = await fetchEnrollments(Number(yearId), classId, sectionId, studentId);
      if (requestGeneration !== searchGeneration.current) return;
      setRosterCount(new Set(enrollments.map((item) => item.student_id)).size);
      if (!enrollments.length) { setHasSearched(true); return; }
      const enrollmentMap = new Map(enrollments.map((item) => [item.id, item]));
      const studentIds = [...new Set(enrollments.map((item) => item.student_id))];
      const studentMap = new Map<number, Student>();
      for (let index = 0; index < studentIds.length; index += IN_BATCH_SIZE) {
        const { data, error: studentError } = await supabase.from("students")
          .select("id, admission_number, first_name, last_name")
          .in("id", studentIds.slice(index, index + IN_BATCH_SIZE));
        if (requestGeneration !== searchGeneration.current) return;
        if (studentError) throw new Error(studentError.message);
        for (const student of (data ?? []) as Student[]) studentMap.set(student.id, student);
      }
      const records: AttendanceRow[] = [];
      const enrollmentIds = enrollments.map((item) => item.id);
      for (let index = 0; index < enrollmentIds.length; index += IN_BATCH_SIZE) {
        const batchIds = enrollmentIds.slice(index, index + IN_BATCH_SIZE);
        for (let from = 0; ; from += FETCH_SIZE) {
          let query = supabase.from("attendance_records")
            .select("id, enrollment_id, attendance_date, status, remarks")
            .in("enrollment_id", batchIds)
            .gte("attendance_date", startDate)
            .lte("attendance_date", endDate)
            .order("attendance_date", { ascending: false })
            .range(from, from + FETCH_SIZE - 1);
          if (status) query = query.eq("status", status);
          const { data, error: recordError } = await query;
          if (requestGeneration !== searchGeneration.current) return;
          if (recordError) throw new Error(recordError.message);
          const batch = data ?? [];
          for (const record of batch) {
            const enrollment = enrollmentMap.get(record.enrollment_id);
            const student = enrollment ? studentMap.get(enrollment.student_id) : undefined;
            if (enrollment && student) records.push({
              id: record.id,
              enrollment_id: record.enrollment_id,
              attendance_date: record.attendance_date,
              status: record.status as Status,
              remarks: record.remarks,
              student,
              roll_number: enrollment.roll_number,
              class_id: enrollment.class_id,
              section_id: enrollment.section_id,
              academic_year_id: enrollment.academic_year_id,
            });
          }
          if (batch.length < FETCH_SIZE) break;
        }
      }
      records.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || (a.roll_number ?? Number.MAX_SAFE_INTEGER) - (b.roll_number ?? Number.MAX_SAFE_INTEGER));
      if (requestGeneration !== searchGeneration.current) return;
      setRows(records);
      setHasSearched(true);
    } catch (searchError) {
      if (requestGeneration === searchGeneration.current) setError(searchError instanceof Error ? searchError.message : "Unable to load attendance history.");
    } finally {
      if (requestGeneration === searchGeneration.current) setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const sectionMap = useMemo(() => new Map(sections.map((item) => [item.id, item.name])), [sections]);
  const yearMap = useMemo(() => new Map(years.map((item) => [item.id, item.name])), [years]);
  const summary = useMemo(() => {
    const byStatus = Object.fromEntries(statusOptions.map((item) => [item.value, 0])) as Record<Status, number>;
    const students = new Map<number, { student: Student; roll: number | null; classId: number; sectionId: number; total: number; counts: Record<Status, number> }>();
    const groups = new Map<string, { classId: number; sectionId: number; total: number; counts: Record<Status, number> }>();
    for (const row of rows) {
      byStatus[row.status] += 1;
      const studentRow = students.get(row.student.id) ?? { student: row.student, roll: row.roll_number, classId: row.class_id, sectionId: row.section_id, total: 0, counts: { present: 0, absent: 0, late: 0, leave: 0, half_day: 0 } };
      studentRow.total += 1;
      studentRow.counts[row.status] += 1;
      students.set(row.student.id, studentRow);
      const key = `${row.class_id}:${row.section_id}`;
      const group = groups.get(key) ?? { classId: row.class_id, sectionId: row.section_id, total: 0, counts: { present: 0, absent: 0, late: 0, leave: 0, half_day: 0 } };
      group.total += 1;
      group.counts[row.status] += 1;
      groups.set(key, group);
    }
    return { byStatus, students: [...students.values()].sort((a, b) => a.student.first_name.localeCompare(b.student.first_name)), groups: [...groups.values()].sort((a, b) => (classMap.get(a.classId) ?? "").localeCompare(classMap.get(b.classId) ?? "") || (sectionMap.get(a.sectionId) ?? "").localeCompare(sectionMap.get(b.sectionId) ?? "")) };
  }, [rows, classMap, sectionMap]);
  const markedDays = rows.length;
  const attendanceRate = markedDays ? Math.round(((summary.byStatus.present + summary.byStatus.late + summary.byStatus.half_day) / markedDays) * 100) : 0;
  const exactDate = startDate === endDate && !status;
  const unmarked = exactDate ? Math.max(0, rosterCount - new Set(rows.map((row) => row.student.id)).size) : null;
  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <section className="mt-8 space-y-5 border-t border-slate-200 pt-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Phase 4 · History & reports</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Attendance history</h2><p className="mt-1 text-sm text-slate-500">Filter saved attendance by date range, class, section, student or status.</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>Academic year<select className={inputClass} value={yearId} onChange={(event) => { setYearId(event.target.value); setClassId(""); setSectionId(""); setStudentId(""); setStudentOptions([]); setLoadingStudents(Boolean(event.target.value)); clearResults(); }}><option value="">Choose year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_active ? " · Current" : ""}</option>)}</select></label>
          <label className={labelClass}>Class<select className={inputClass} value={classId} disabled={!yearId} onChange={(event) => { setClassId(event.target.value); setSectionId(""); setStudentId(""); setStudentOptions([]); setLoadingStudents(Boolean(yearId)); clearResults(); }}><option value="">All available classes</option>{allowedClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className={labelClass}>Section<select className={inputClass} value={sectionId} disabled={!yearId} onChange={(event) => { setSectionId(event.target.value); setStudentId(""); setStudentOptions([]); setLoadingStudents(Boolean(yearId)); clearResults(); }}><option value="">All available sections</option>{allowedSections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className={labelClass}>Student (optional)<select className={inputClass} value={studentId} disabled={!yearId || loadingStudents} onChange={(event) => { setStudentId(event.target.value); clearResults(); }}><option value="">All students</option>{studentOptions.map((item) => <option key={item.id} value={item.id}>{item.label}{item.roll === null ? "" : ` · Roll ${item.roll}`}</option>)}</select>{loadingStudents && <span className="mt-1 block text-xs font-normal normal-case text-slate-400">Loading students…</span>}</label>
          <label className={labelClass}>Start date<input className={inputClass} type="date" value={startDate} max={localDateValue(new Date())} onChange={(event) => { setStartDate(event.target.value); clearResults(); }} /></label>
          <label className={labelClass}>End date<input className={inputClass} type="date" value={endDate} min={startDate || undefined} max={localDateValue(new Date())} onChange={(event) => { setEndDate(event.target.value); clearResults(); }} /></label>
          <label className={labelClass}>Status<select className={inputClass} value={status} onChange={(event) => { setStatus(event.target.value as "" | Status); clearResults(); }}><option value="">All statuses</option>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="flex items-end"><button type="button" onClick={search} disabled={loading || loadingStudents} className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Loading report…" : "Run report"}</button></div>
        </div>
        {role === "teacher" && <p className="mt-4 text-xs text-slate-500">Available choices follow your assignments; Supabase RLS still controls every query.</p>}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading attendance records…</div>}
      {!loading && hasSearched && rows.length === 0 && <>
        {exactDate && rosterCount > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"><SummaryCard label="Total students" value={rosterCount} />{statusOptions.map((item) => <SummaryCard key={item.value} label={item.label} value={0} />)}<SummaryCard label="Unmarked" value={unmarked ?? 0} /><SummaryCard label="Attendance rate" value="0%" /></div>}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-semibold text-slate-900">{rosterCount ? "No attendance has been marked for this date" : "No attendance records found"}</h3><p className="mt-1 text-sm text-slate-500">{rosterCount ? `${rosterCount} enrolled student${rosterCount === 1 ? " is" : "s are"} currently unmarked.` : "Try a different date range or filter combination."}</p></div>
      </>}
      {!loading && hasSearched && rows.length > 0 && <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <SummaryCard label="Total students" value={rosterCount} />
          {statusOptions.map((item) => <SummaryCard key={item.value} label={item.label} value={summary.byStatus[item.value]} />)}
          <SummaryCard label="Unmarked" value={unmarked ?? "—"} />
          <SummaryCard label="Attendance rate" value={status ? "—" : `${attendanceRate}%`} />
        </div>
        <p className="text-xs text-slate-500">{status ? `Counts and student/class breakdowns are limited to the selected ${statusOptions.find((item) => item.value === status)?.label} status; percentage is omitted for this filtered view.` : "Rate uses the existing rule: Present, Late, and Half Day count fully; Absent and Leave count zero. Unmarked students are excluded. For date ranges, totals count saved attendance days."}</p>

        {studentId && summary.students[0] && <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Student report</p><h3 className="mt-1 text-xl font-bold text-indigo-950">{summary.students[0].student.first_name} {summary.students[0].student.last_name ?? ""}</h3><p className="mt-1 text-sm text-indigo-800">Admission {summary.students[0].student.admission_number} · Roll {summary.students[0].roll ?? "—"} · {classMap.get(summary.students[0].classId) ?? "Class"} / {sectionMap.get(summary.students[0].sectionId) ?? "Section"} · {yearMap.get(Number(yearId)) ?? "Academic year"}</p><p className="mt-3 text-sm text-indigo-900">{summary.students[0].total} marked days · {status ? "—" : `${attendanceRate}%`} attendance for selected period</p></section>}

        {!studentId && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:px-6"><h3 className="font-semibold text-slate-900">Student-wise report</h3><p className="mt-1 text-xs text-slate-500">Status totals for each student in the selected period.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class / Section</th><th className="px-4 py-3">Records</th>{statusOptions.map((item) => <th key={item.value} className="px-4 py-3">{item.label}</th>)}<th className="px-4 py-3">Rate</th></tr></thead><tbody className="divide-y divide-slate-100">{summary.students.map((item) => { const rate = item.total ? Math.round(((item.counts.present + item.counts.late + item.counts.half_day) / item.total) * 100) : 0; return <tr key={item.student.id}><td className="px-4 py-3 font-medium text-slate-900">{item.student.first_name} {item.student.last_name ?? ""}<span className="block text-xs font-normal text-slate-500">{item.student.admission_number} · Roll {item.roll ?? "—"}</span></td><td className="px-4 py-3 text-slate-600">{classMap.get(item.classId)} / {sectionMap.get(item.sectionId)}</td><td className="px-4 py-3">{item.total}</td>{statusOptions.map((statusItem) => <td key={statusItem.value} className="px-4 py-3">{item.counts[statusItem.value]}</td>)}<td className="px-4 py-3 font-semibold">{status ? "—" : `${rate}%`}</td></tr>; })}</tbody></table></div></section>}

        {!classId && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:px-6"><h3 className="font-semibold text-slate-900">Class-wise report</h3><p className="mt-1 text-xs text-slate-500">Attendance counts grouped by class and section.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Records</th>{statusOptions.map((item) => <th key={item.value} className="px-4 py-3">{item.label}</th>)}<th className="px-4 py-3">Rate</th></tr></thead><tbody className="divide-y divide-slate-100">{summary.groups.map((item) => { const rate = item.total ? Math.round(((item.counts.present + item.counts.late + item.counts.half_day) / item.total) * 100) : 0; return <tr key={`${item.classId}:${item.sectionId}`}><td className="px-4 py-3 font-medium">{classMap.get(item.classId) ?? "—"}</td><td className="px-4 py-3">{sectionMap.get(item.sectionId) ?? "—"}</td><td className="px-4 py-3">{item.total}</td>{statusOptions.map((statusItem) => <td key={statusItem.value} className="px-4 py-3">{item.counts[statusItem.value]}</td>)}<td className="px-4 py-3 font-semibold">{status ? "—" : `${rate}%`}</td></tr>; })}</tbody></table></div></section>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:px-6"><div><h3 className="font-semibold text-slate-900">Attendance records</h3><p className="mt-1 text-xs text-slate-500">{rows.length} saved records · {startDate} to {endDate}</p></div><p className="text-xs text-slate-500">Page {page + 1} of {totalPages}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Remarks</th></tr></thead><tbody className="divide-y divide-slate-100">{pageRows.map((row) => { const badge = statusOptions.find((item) => item.value === row.status); return <tr key={row.id}><td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.attendance_date}</td><td className="px-4 py-3 font-medium text-slate-900">{row.student.first_name} {row.student.last_name ?? ""}<span className="block text-xs font-normal text-slate-500">{row.student.admission_number} · Roll {row.roll_number ?? "—"}</span></td><td className="px-4 py-3 text-slate-600">{classMap.get(row.class_id) ?? "—"}</td><td className="px-4 py-3 text-slate-600">{sectionMap.get(row.section_id) ?? "—"}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badge?.color ?? ""}`}>{badge?.label ?? row.status}</span></td><td className="max-w-xs px-4 py-3 text-slate-600">{row.remarks || "—"}</td></tr>; })}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6"><button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40">Previous</button><span className="text-xs text-slate-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40">Next</button></div></section>
      </>}
      {!hasSearched && !loading && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Choose a date range and run the report to view saved attendance history.</div>}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>;
}
