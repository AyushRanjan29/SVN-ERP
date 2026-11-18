import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import SubjectConfiguration from "./SubjectConfiguration";

export default async function ExaminationSubjectsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await params;
  const examinationId = Number(id);
  if (!Number.isSafeInteger(examinationId) || examinationId <= 0) notFound();
  const supabase = await createClient();
  const { data: exam, error: examError } = await supabase.from("examinations").select("id, class_id, name").eq("id", examinationId).maybeSingle();
  if (examError) return <main className="p-6 text-sm text-rose-700">Unable to load examination: {examError.message}</main>;
  if (!exam) notFound();
  const [classSubjectResult, configuredResult, sectionResult] = await Promise.all([
    supabase.from("class_subjects").select("subject_id, section_id").eq("class_id", exam.class_id),
    supabase.from("examination_subjects").select("id, subject_id, section_id, maximum_marks, passing_marks, allow_negative_marks").eq("examination_id", examinationId),
    supabase.from("sections").select("id, name").eq("class_id", exam.class_id),
  ]);
  const error = classSubjectResult.error ?? configuredResult.error ?? sectionResult.error;
  if (error) return <main className="p-6 text-sm text-rose-700">Unable to load subject configuration: {error.message}</main>;
  const classSubjects = classSubjectResult.data ?? [];
  const configs = configuredResult.data ?? [];
  const sectionMap = new Map((sectionResult.data ?? []).map((item) => [item.id, item.name]));
  const subjectIds = [...new Set([...classSubjects.map((item) => item.subject_id), ...configs.map((item) => item.subject_id)])];
  const { data: subjects, error: subjectError } = subjectIds.length ? await supabase.from("subjects").select("id, name").in("id", subjectIds).order("name") : { data: [], error: null };
  if (subjectError) return <main className="p-6 text-sm text-rose-700">Unable to load subjects: {subjectError.message}</main>;
  const subjectMap = new Map((subjects ?? []).map((item) => [item.id, item.name]));
  const offerings = classSubjects.map((item) => ({ subjectId: item.subject_id, subjectName: subjectMap.get(item.subject_id) ?? `Subject ${item.subject_id}`, sectionId: item.section_id, sectionName: item.section_id === null ? null : sectionMap.get(item.section_id) ?? "Section" }));
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><SubjectConfiguration examinationId={exam.id} examinationName={exam.name} offerings={offerings} configured={configs} /><div className="mx-auto mt-5 max-w-5xl"><Link className="text-sm font-medium text-indigo-600 hover:underline" href={`/admin/examinations/${exam.id}/reports`}>View results and reports →</Link></div></main>;
}
