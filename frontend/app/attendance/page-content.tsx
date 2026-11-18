import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import AttendanceManager from "./AttendanceManager";

export default async function AttendancePageContent({ role }: { role: "admin" | "teacher" }) {
  await requireRole([role]);
  const supabase = await createClient();
  const [yearResult, classResult, sectionResult, assignmentResult] = await Promise.all([
    role === "admin" ? supabase.from("academic_years").select("id, name, is_active").order("start_date", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    role === "admin" ? supabase.from("classes").select("id, name").order("id") : Promise.resolve({ data: [], error: null }),
    role === "admin" ? supabase.from("sections").select("id, name, class_id").order("id") : Promise.resolve({ data: [], error: null }),
    role === "teacher" ? supabase.from("teacher_assignments").select("class_id, section_id, academic_year_id") : Promise.resolve({ data: [], error: null }),
  ]);
  const error = yearResult.error ?? classResult.error ?? sectionResult.error ?? assignmentResult.error;
  let years = yearResult.data ?? [];
  let classes = classResult.data ?? [];
  let sections = sectionResult.data ?? [];
  const assignments = (assignmentResult.data ?? []) as { class_id: number; section_id: number; academic_year_id: number }[];

  if (role === "teacher" && assignments.length) {
    const yearIds = [...new Set(assignments.map((a) => a.academic_year_id))];
    const classIds = [...new Set(assignments.map((a) => a.class_id))];
    const sectionIds = [...new Set(assignments.map((a) => a.section_id))];
    const [yearRows, classRows, sectionRows] = await Promise.all([
      supabase.from("academic_years").select("id, name, is_active").in("id", yearIds).order("start_date", { ascending: false }),
      supabase.from("classes").select("id, name").in("id", classIds),
      supabase.from("sections").select("id, name, class_id").in("id", sectionIds),
    ]);
    const lookupError = yearRows.error ?? classRows.error ?? sectionRows.error;
    if (lookupError) return <ErrorPanel message={lookupError.message} />;
    years = yearRows.data ?? [];
    classes = classRows.data ?? [];
    sections = sectionRows.data ?? [];
  }
  if (error) return <ErrorPanel message={error.message} />;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href={role === "admin" ? "/admin" : "/teacher"} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">← Dashboard</Link>
        <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">SVN ERP · Academics</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Attendance</h1><p className="mt-2 text-sm text-slate-500">Take the class register and review attendance for a selected day.</p></div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">{role === "admin" ? "Administrator" : "Teacher access"}</div>
        </header>
        <AttendanceManager role={role} years={years} classes={classes} sections={sections} assignments={assignments} />
      </div>
    </main>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return <main className="min-h-screen bg-slate-50 p-6"><div role="alert" className="mx-auto max-w-4xl rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-700">Unable to load attendance options: {message}</div></main>;
}
