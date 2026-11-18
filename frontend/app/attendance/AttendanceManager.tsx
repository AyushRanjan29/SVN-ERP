"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AttendanceHistory from "./AttendanceHistory";

type Option = { id: number; name: string };
type Assignment = { class_id: number; section_id: number; academic_year_id: number };
type Enrollment = {
  id: number; student_id: number; class_id: number; section_id: number;
  academic_year_id: number; roll_number: number | null; status: string;
};
type Student = { id: number; admission_number: string; first_name: string; last_name: string | null };
type AttendanceStatus = "present" | "absent" | "late" | "leave" | "half_day";
type Row = Enrollment & { student: Student; attendance: AttendanceStatus | null };

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function assignmentAllows(role: "admin" | "teacher", assignments: Assignment[], year: number, cls: number, section: number) {
  return role === "admin" || assignments.some(
    (a) => a.academic_year_id === year && a.class_id === cls && a.section_id === section,
  );
}

const statuses: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "absent", label: "Absent", color: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "late", label: "Late", color: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "leave", label: "Leave", color: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "half_day", label: "Half Day", color: "border-violet-200 bg-violet-50 text-violet-700" },
];

export default function AttendanceManager({
  role, years, classes, sections, assignments,
}: {
  role: "admin" | "teacher"; years: (Option & { is_active?: boolean })[];
  classes: Option[]; sections: (Option & { class_id: number })[]; assignments: Assignment[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const activeYear = years.find((year) => year.is_active);
  const [yearId, setYearId] = useState(activeYear ? String(activeYear.id) : "");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(() => localDateInputValue(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const availableClasses = useMemo(() => role === "admin" ? classes : classes.filter((c) => assignments.some((a) => a.class_id === c.id && (!yearId || a.academic_year_id === Number(yearId)))), [role, classes, assignments, yearId]);
  const availableSections = useMemo(() => sections.filter((s) => s.class_id === Number(classId) && (!yearId || assignmentAllows(role, assignments, Number(yearId), Number(classId), s.id))), [sections, classId, yearId, role, assignments]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoster() {
      setLoading(false);
      setRows([]);
      setError("");
      setMessage("");
      if (!yearId || !classId || !sectionId || !assignmentAllows(role, assignments, Number(yearId), Number(classId), Number(sectionId))) return;
      setLoading(true);
      try {
        const { data: enrollments, error: enrollmentError } = await supabase.from("enrollments")
          .select("id, student_id, class_id, section_id, academic_year_id, roll_number, status")
          .eq("academic_year_id", Number(yearId)).eq("class_id", Number(classId)).eq("section_id", Number(sectionId)).eq("status", "active");
        if (cancelled) return;
        if (enrollmentError) { setError(enrollmentError.message); return; }
        const enrollmentRows = (enrollments ?? []) as Enrollment[];
        if (!enrollmentRows.length) return;
        const ids = enrollmentRows.map((item) => item.id);
        const studentIds = enrollmentRows.map((item) => item.student_id);
        const [{ data: students, error: studentError }, { data: attendance, error: attendanceError }] = await Promise.all([
          supabase.from("students").select("id, admission_number, first_name, last_name").in("id", studentIds),
          supabase.from("attendance_records").select("id, enrollment_id, status").eq("attendance_date", date).in("enrollment_id", ids),
        ]);
        if (cancelled) return;
        if (studentError || attendanceError) { setError(studentError?.message ?? attendanceError?.message ?? "Unable to load attendance."); return; }
        const studentMap = new Map(((students ?? []) as Student[]).map((item) => [item.id, item]));
        const attendanceMap = new Map((attendance ?? []).map((item) => [item.enrollment_id, item]));
        const next = enrollmentRows.flatMap((enrollment) => {
          const student = studentMap.get(enrollment.student_id);
          if (!student) return [];
          const saved = attendanceMap.get(enrollment.id);
          return [{ ...enrollment, student, attendance: (saved?.status ?? null) as AttendanceStatus | null }];
        }).sort((a, b) => (a.roll_number ?? Number.MAX_SAFE_INTEGER) - (b.roll_number ?? Number.MAX_SAFE_INTEGER));
        setRows(next);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load attendance.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRoster();
    return () => { cancelled = true; };
  }, [supabase, yearId, classId, sectionId, date, role, assignments]);

  const counts = useMemo(() => statuses.map((status) => ({ ...status, count: rows.filter((r) => r.attendance === status.value).length })), [rows]);
  const unmarkedCount = rows.filter((row) => row.attendance === null).length;
  const presentCount = rows.filter((row) => row.attendance === "present" || row.attendance === "late" || row.attendance === "half_day").length;
  const markedCount = rows.length - unmarkedCount;
  const percentage = markedCount ? Math.round((presentCount / markedCount) * 100) : 0;

  function setOne(id: number, status: AttendanceStatus) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, attendance: status } : row));
    setMessage(""); setError("");
  }

  async function save() {
    setError(""); setMessage("");
    if (!rows.length) return;
    if (rows.some((row) => row.attendance === null)) {
      setError("Mark an attendance status for every student before saving, or use Mark all present.");
      return;
    }
    if (!assignmentAllows(role, assignments, Number(yearId), Number(classId), Number(sectionId))) { setError("This class and section are not assigned to your account."); return; }
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setError("Your session has expired. Sign in again."); return; }
      const markedRows = rows.filter((row): row is Row & { attendance: AttendanceStatus } => row.attendance !== null);
      const payload = markedRows.map((row) => ({ enrollment_id: row.id, attendance_date: date, status: row.attendance, marked_by: user.id, updated_at: new Date().toISOString() }));
      const { error: saveError } = await supabase.from("attendance_records").upsert(payload, { onConflict: "enrollment_id,attendance_date" });
      if (saveError) setError(saveError.message);
      else setMessage("Attendance saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  const selectClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Academic year<select className={selectClass} value={yearId} onChange={(e) => { setYearId(e.target.value); setClassId(""); setSectionId(""); }}><option value="">Choose year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_active ? " · Current" : ""}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class<select className={selectClass} value={classId} disabled={!yearId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }}><option value="">Choose class</option>{availableClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section<select className={selectClass} value={sectionId} disabled={!classId} onChange={(e) => setSectionId(e.target.value)}><option value="">Choose section</option>{availableSections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance date<input className={selectClass} type="date" value={date} max={localDateInputValue(new Date())} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        {role === "teacher" && <p className="mt-4 text-xs text-slate-500">Your class and section options come from your teacher assignments.</p>}
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading enrolled students…</div> : rows.length > 0 ? <>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <div className="col-span-2 rounded-2xl bg-slate-900 p-4 text-white sm:col-span-1"><p className="text-xs text-slate-300">Students</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></div>
          {counts.map((item) => <div key={item.value} className={`rounded-2xl border p-4 ${item.color}`}><p className="text-xs">{item.label}</p><p className="mt-1 text-2xl font-bold">{item.count}</p></div>)}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600"><p className="text-xs">Unmarked</p><p className="mt-1 text-2xl font-bold">{unmarkedCount}</p></div>
          <div className="col-span-2 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:col-span-3 lg:col-span-7"><div><p className="text-xs font-medium text-indigo-700">Attendance rate · marked students</p><p className="mt-1 text-xl font-bold text-indigo-950">{percentage}%</p></div><div className="h-2 w-2/3 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percentage}%` }} /></div></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-6"><div><h2 className="font-semibold text-slate-900">Student attendance</h2><p className="mt-1 text-xs text-slate-500">{rows.length} active enrollments · {date}</p></div><button type="button" onClick={() => { setRows((current) => current.map((row) => ({ ...row, attendance: "present" }))); setMessage(""); }} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Mark all present</button></div>
          <div className="divide-y divide-slate-100">{rows.map((row) => <article key={row.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">{row.student.first_name[0]}{row.student.last_name?.[0] ?? ""}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{row.student.first_name} {row.student.last_name ?? ""}</p><p className="mt-0.5 text-xs text-slate-500">Roll {row.roll_number ?? "—"} · {row.student.admission_number} <span className="font-medium text-slate-700">· {row.attendance ? statuses.find((status) => status.value === row.attendance)?.label : "Unmarked"}</span></p></div></div><div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-end">{statuses.map((status) => <button key={status.value} type="button" aria-pressed={row.attendance === status.value} onClick={() => setOne(row.id, status.value)} className={`rounded-lg border px-2 py-2 text-xs font-medium transition sm:px-3 ${row.attendance === status.value ? `${status.color} ring-2 ring-current ring-offset-1` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{status.label}</button>)}</div></article>)}</div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-xs text-slate-500">{unmarkedCount ? `${unmarkedCount} student${unmarkedCount === 1 ? " is" : "s are"} unmarked. Mark each student before saving.` : "All students have a status. Saving updates the selected date."} Database permissions are enforced by Supabase RLS.</p><button type="button" onClick={save} disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save attendance"}</button></div>
        </section>
      </> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600">✓</div><h2 className="mt-4 font-semibold text-slate-900">{yearId && classId && sectionId ? "No active students found" : "Choose a class to get started"}</h2><p className="mt-1 text-sm text-slate-500">Select an academic year, class, section and date to view the roster.</p></div>}
      <AttendanceHistory role={role} years={years} classes={classes} sections={sections} assignments={assignments} />
    </div>
  );
}
