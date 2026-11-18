import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import MarksEntry, { type MarksStudent } from "@/app/exams/MarksEntry";

export default async function AdminExamMarksPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ subject?: string; section?: string }> }) {
  await requireRole(["admin"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const examinationId = Number(id);
  if (!Number.isSafeInteger(examinationId) || examinationId <= 0) notFound();
  const supabase = await createClient();
  const { data: exam, error: examError } = await supabase.from("examinations").select("id, academic_year_id, class_id, name, exam_type").eq("id", examinationId).maybeSingle();
  if (examError) return <main className="p-6 text-sm text-rose-700">Unable to load examination: {examError.message}</main>;
  if (!exam) notFound();
  const [{ data: configs, error: configError }, { data: sections, error: sectionError }, { data: classRow }] = await Promise.all([
    supabase.from("examination_subjects").select("id, subject_id, section_id, maximum_marks, passing_marks, allow_negative_marks").eq("examination_id", examinationId),
    supabase.from("sections").select("id, name").eq("class_id", exam.class_id).order("name"),
    supabase.from("classes").select("id, name").eq("id", exam.class_id).maybeSingle(),
  ]);
  if (configError || sectionError) return <main className="p-6 text-sm text-rose-700">Unable to load marks entry options: {configError?.message ?? sectionError?.message}</main>;
  const configsList = configs ?? [];
  const sectionsList = sections ?? [];
  const subjectRows = configsList.length ? await supabase.from("subjects").select("id, name").in("id", [...new Set(configsList.map((item) => item.subject_id))]) : { data: [], error: null };
  if (subjectRows.error) return <main className="p-6 text-sm text-rose-700">Unable to load subjects: {subjectRows.error.message}</main>;
  const subjectMap = new Map((subjectRows.data ?? []).map((item) => [item.id, item.name]));
  const selectedSection = sectionsList.find((item) => item.id === Number(query.section));
  const selected = configsList.find((item) => item.id === Number(query.subject) && (item.section_id === null || item.section_id === selectedSection?.id));
  if (!selected || !selectedSection) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-5xl"><Link href="/admin/examinations" className="text-sm text-indigo-600 hover:underline">← Examinations</Link><h1 className="mt-4 text-2xl font-bold text-slate-950">Marks entry · {exam.name}</h1><p className="mt-1 text-sm text-slate-500">Choose a configured subject and class section.</p>{configsList.length > 0 && sectionsList.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{configsList.flatMap((config) => sectionsList.filter((section) => config.section_id === null || config.section_id === section.id).map((section) => <Link key={`${config.id}-${section.id}`} href={`/admin/examinations/${exam.id}/marks?subject=${config.id}&section=${section.id}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300"><p className="font-semibold text-slate-900">{subjectMap.get(config.subject_id)} · {section.name}</p><p className="mt-1 text-sm text-slate-500">Max {config.maximum_marks} · Pass {config.passing_marks}</p></Link>))}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Configure examination subjects and class sections first.</div>}</div></main>;

  const { data: enrollments, error: enrollmentError } = await supabase.from("enrollments").select("id, student_id, roll_number").eq("class_id", exam.class_id).eq("academic_year_id", exam.academic_year_id).eq("section_id", selectedSection.id).eq("status", "active").order("roll_number");
  if (enrollmentError) return <main className="p-6 text-sm text-rose-700">Unable to load enrolled students: {enrollmentError.message}</main>;
  const roster = enrollments ?? [];
  const enrollmentIds = roster.map((item) => item.id);
  const studentIds = [...new Set(roster.map((item) => item.student_id))];
  const [studentsResult, marksResult] = await Promise.all([
    studentIds.length ? supabase.from("students").select("id, admission_number, first_name, last_name").in("id", studentIds) : Promise.resolve({ data: [], error: null }),
    enrollmentIds.length ? supabase.from("exam_marks").select("enrollment_id, marks_obtained, is_absent, remarks").eq("examination_subject_id", selected.id).in("enrollment_id", enrollmentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (studentsResult.error || marksResult.error) return <main className="p-6 text-sm text-rose-700">Unable to load existing marks: {studentsResult.error?.message ?? marksResult.error?.message}</main>;
  const studentMap = new Map((studentsResult.data ?? []).map((item) => [item.id, item]));
  const marksMap = new Map((marksResult.data ?? []).map((item) => [item.enrollment_id, item]));
  const students: MarksStudent[] = roster.flatMap((enrollment) => {
    const student = studentMap.get(enrollment.student_id);
    if (!student) return [];
    const mark = marksMap.get(enrollment.id);
    return [{ enrollmentId: enrollment.id, studentId: student.id, name: `${student.first_name} ${student.last_name ?? ""}`.trim(), admissionNumber: student.admission_number, rollNumber: enrollment.roll_number, marks: mark?.marks_obtained ?? null, absent: mark?.is_absent ?? false, remarks: mark?.remarks ?? null }];
  });
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl"><Link href="/admin/examinations" className="text-sm font-medium text-indigo-600 hover:underline">← Examinations</Link><header className="my-5"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{exam.exam_type} · {classRow?.name} · {selectedSection.name}</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{exam.name}</h1></header><MarksEntry key={`${exam.id}-${selected.id}-${selectedSection.id}`} examinationId={exam.id} examSubjectId={selected.id} subjectName={subjectMap.get(selected.subject_id) ?? "Subject"} maximumMarks={selected.maximum_marks} passingMarks={selected.passing_marks} allowNegativeMarks={selected.allow_negative_marks} students={students} /></div></main>;
}
