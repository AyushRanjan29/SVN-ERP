import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherExaminationsPage() {
  await requireRole(["teacher"]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-6">Sign in to view examinations.</div>;
  const { data: teacher, error: teacherError } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
  if (teacherError || !teacher) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{teacherError?.message ?? "Teacher profile was not found."}</div></main>;
  const { data: assignments, error: assignmentError } = await supabase.from("teacher_assignments").select("class_id, section_id, subject_id, academic_year_id").eq("teacher_id", teacher.id);
  if (assignmentError) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load your assignments: {assignmentError.message}</div></main>;
  const assignmentRows = assignments ?? [];
  const [examResult, subjectResult, classResult, sectionResult, yearResult] = await Promise.all([
    supabase.from("examinations").select("id, academic_year_id, class_id, name, exam_type, start_date, end_date, status").order("start_date", { ascending: false }),
    assignmentRows.length ? supabase.from("subjects").select("id, name").in("id", [...new Set(assignmentRows.map((item) => item.subject_id))]) : Promise.resolve({ data: [], error: null }),
    assignmentRows.length ? supabase.from("classes").select("id, name").in("id", [...new Set(assignmentRows.map((item) => item.class_id))]) : Promise.resolve({ data: [], error: null }),
    assignmentRows.length ? supabase.from("sections").select("id, name").in("id", [...new Set(assignmentRows.map((item) => item.section_id))]) : Promise.resolve({ data: [], error: null }),
    assignmentRows.length ? supabase.from("academic_years").select("id, name").in("id", [...new Set(assignmentRows.map((item) => item.academic_year_id))]) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = examResult.error ?? subjectResult.error ?? classResult.error ?? sectionResult.error ?? yearResult.error;
  if (error) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load assigned examinations: {error.message}</div></main>;
  const subjectMap = new Map((subjectResult.data ?? []).map((item) => [item.id, item.name]));
  const classMap = new Map((classResult.data ?? []).map((item) => [item.id, item.name]));
  const sectionMap = new Map((sectionResult.data ?? []).map((item) => [item.id, item.name]));
  const yearMap = new Map((yearResult.data ?? []).map((item) => [item.id, item.name]));
  const examSubjects = examResult.data?.length ? await supabase.from("examination_subjects").select("id, examination_id, subject_id, section_id, maximum_marks, passing_marks, allow_negative_marks").in("examination_id", examResult.data.map((exam) => exam.id)) : { data: [], error: null };
  if (examSubjects.error) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load examination subjects: {examSubjects.error.message}</div></main>;
  const cards = (examResult.data ?? []).flatMap((exam) => (examSubjects.data ?? []).flatMap((examSubject) => {
    if (examSubject.examination_id !== exam.id) return [];
    return assignmentRows.filter((assignment) => assignment.class_id === exam.class_id && assignment.academic_year_id === exam.academic_year_id && assignment.subject_id === examSubject.subject_id && (examSubject.section_id === null || examSubject.section_id === assignment.section_id)).map((assignment) => ({ exam, examSubject, assignment }));
  }));
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl"><Link href="/teacher" className="text-sm font-medium text-indigo-600 hover:underline">← Teacher dashboard</Link><header className="my-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">SVN ERP · Academics</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Examinations</h1><p className="mt-2 text-sm text-slate-500">Marks entry is shown only for your assigned class, section and subject.</p></header>{cards.length ? <div className="grid gap-4 md:grid-cols-2">{cards.map(({ exam, examSubject, assignment }) => <article key={`${exam.id}-${examSubject.id}-${assignment.section_id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{exam.exam_type} · {yearMap.get(exam.academic_year_id)}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{exam.name}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">{exam.status}</span></div><p className="mt-3 text-sm text-slate-600">{classMap.get(assignment.class_id)} · {sectionMap.get(assignment.section_id)} · {subjectMap.get(assignment.subject_id)}</p><p className="mt-1 text-xs text-slate-500">{exam.start_date} – {exam.end_date} · Max {examSubject.maximum_marks} · Pass {examSubject.passing_marks}</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/teacher/examinations/${exam.id}?subject=${examSubject.id}&section=${assignment.section_id}`} className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Enter / review marks</Link><Link href={`/teacher/examinations/${exam.id}/reports`} className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Assigned-subject reports</Link></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No examinations match your current assignments.</div>}</div></main>;
}
