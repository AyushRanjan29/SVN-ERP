import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import MarksEntry, { type MarksStudent } from "@/app/exams/MarksEntry";

export default async function TeacherExamMarksPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ subject?: string; section?: string }> }) {
  await requireRole(["teacher"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const examinationId = Number(id);
  if (!Number.isSafeInteger(examinationId) || examinationId <= 0) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: teacher }, { data: exam, error: examError }] = await Promise.all([
    supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("examinations").select("id, academic_year_id, class_id, name, exam_type, status").eq("id", examinationId).maybeSingle(),
  ]);
  if (examError) return <main className="p-6 text-sm text-rose-700">Unable to load examination: {examError.message}</main>;
  if (!teacher || !exam) notFound();
  const [{ data: assignments, error: assignmentError }, { data: configured, error: configuredError }] = await Promise.all([
    supabase.from("teacher_assignments").select("class_id, section_id, subject_id, academic_year_id").eq("teacher_id", teacher.id).eq("class_id", exam.class_id).eq("academic_year_id", exam.academic_year_id),
    supabase.from("examination_subjects").select("id, subject_id, section_id, maximum_marks, passing_marks, allow_negative_marks").eq("examination_id", examinationId),
  ]);
  if (assignmentError || configuredError) return <main className="p-6 text-sm text-rose-700">Unable to load assigned subjects: {assignmentError?.message ?? configuredError?.message}</main>;
  const matching = (configured ?? []).flatMap((item) => (assignments ?? []).filter((assignment) => assignment.subject_id === item.subject_id && (item.section_id === null || item.section_id === assignment.section_id)).map((assignment) => ({ config: item, assignment })));
  if (!matching.length) notFound();
  const [{ data: subjectRows }, { data: classRow }, { data: sectionRows }] = await Promise.all([
    supabase.from("subjects").select("id, name").in("id", [...new Set(matching.map((item) => item.config.subject_id))]),
    supabase.from("classes").select("id, name").eq("id", exam.class_id).maybeSingle(),
    supabase.from("sections").select("id, name").in("id", [...new Set(matching.map((item) => item.assignment.section_id))]),
  ]);
  const subjectMap = new Map((subjectRows ?? []).map((item) => [item.id, item.name]));
  const sectionMap = new Map((sectionRows ?? []).map((item) => [item.id, item.name]));
  const selectedSubjectId = Number(query.subject);
  const selectedSectionId = Number(query.section);
  const selected = matching.find((item) => item.config.id === selectedSubjectId && item.assignment.section_id === selectedSectionId);
  if (!selected) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-5xl"><Link href="/teacher/examinations" className="text-sm text-indigo-600 hover:underline">← Assigned examinations</Link><h1 className="mt-4 text-2xl font-bold text-slate-950">{exam.name}</h1><p className="mt-1 text-sm text-slate-500">Choose one of your assigned subject and section combinations.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{matching.map(({ config, assignment }) => <Link key={`${config.id}-${assignment.section_id}`} href={`/teacher/examinations/${exam.id}?subject=${config.id}&section=${assignment.section_id}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300"><p className="font-semibold text-slate-900">{subjectMap.get(config.subject_id) ?? "Subject"}</p><p className="mt-1 text-sm text-slate-500">{classRow?.name} · {sectionMap.get(assignment.section_id)} · Max {config.maximum_marks}</p></Link>)}</div></div></main>;

  const { data: roster, error: rosterError } = await supabase.from("teacher_exam_student_roster")
    .select("enrollment_id, student_id, admission_number, first_name, last_name, roll_number, class_id, section_id, academic_year_id")
    .eq("class_id", exam.class_id)
    .eq("academic_year_id", exam.academic_year_id)
    .eq("section_id", selected.assignment.section_id)
    .order("roll_number", { ascending: true });
  if (rosterError) return <main className="p-6 text-sm text-rose-700">Unable to load assigned students: {rosterError.message}</main>;
  const enrollmentIds = (roster ?? []).map((item) => item.enrollment_id);
  const { data: marks, error: markError } = enrollmentIds.length
    ? await supabase.from("exam_marks").select("enrollment_id, marks_obtained, is_absent, remarks").eq("examination_subject_id", selected.config.id).in("enrollment_id", enrollmentIds)
    : { data: [], error: null };
  if (markError) return <main className="p-6 text-sm text-rose-700">Unable to load marks: {markError.message}</main>;
  const marksMap = new Map((marks ?? []).map((item) => [item.enrollment_id, item]));
  const students: MarksStudent[] = (roster ?? []).map((student) => {
    const mark = marksMap.get(student.enrollment_id);
    return { enrollmentId: student.enrollment_id, studentId: student.student_id, name: `${student.first_name} ${student.last_name ?? ""}`.trim(), admissionNumber: student.admission_number, rollNumber: student.roll_number, marks: mark?.marks_obtained ?? null, absent: mark?.is_absent ?? false, remarks: mark?.remarks ?? null };
  });
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl"><Link href="/teacher/examinations" className="text-sm font-medium text-indigo-600 hover:underline">← Assigned examinations</Link><header className="my-5"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{exam.exam_type} · {classRow?.name} · {sectionMap.get(selected.assignment.section_id)}</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{exam.name}</h1></header><MarksEntry key={`${exam.id}-${selected.config.id}-${selected.assignment.section_id}`} examinationId={exam.id} examSubjectId={selected.config.id} subjectName={subjectMap.get(selected.config.subject_id) ?? "Subject"} maximumMarks={selected.config.maximum_marks} passingMarks={selected.config.passing_marks} allowNegativeMarks={selected.config.allow_negative_marks} canEdit={exam.status !== "completed"} students={students} /></div></main>;
}
