import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import ExaminationAdmin from "./ExaminationAdmin";

export default async function ExaminationsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [yearResult, classResult, examResult] = await Promise.all([
    supabase.from("academic_years").select("id, name").order("start_date", { ascending: false }),
    supabase.from("classes").select("id, name").order("id"),
    supabase.from("examinations").select("id, academic_year_id, class_id, name, exam_type, start_date, end_date, status, created_at").order("start_date", { ascending: false }),
  ]);
  const error = yearResult.error ?? classResult.error ?? examResult.error;
  if (error) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load examinations: {error.message}</div></main>;
  const years = yearResult.data ?? [];
  const classes = classResult.data ?? [];
  const examinations = (examResult.data ?? []).map((exam) => ({ id: exam.id, academicYearId: exam.academic_year_id, classId: exam.class_id, name: exam.name, examType: exam.exam_type, startDate: exam.start_date, endDate: exam.end_date, status: exam.status as "draft" | "scheduled" | "ongoing" | "completed", created_at: exam.created_at }));
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-medium text-indigo-600 hover:underline">← Admin dashboard</Link><header className="my-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">SVN ERP · Academics</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Examination management</h1><p className="mt-2 text-sm text-slate-500">Create examinations, configure subjects, and review class results.</p></header><ExaminationAdmin years={years} classes={classes} examinations={examinations} /></div></main>;
}
