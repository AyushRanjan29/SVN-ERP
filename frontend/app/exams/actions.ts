"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

export type ExaminationInput = {
  academicYearId: number;
  classId: number;
  name: string;
  examType: string;
  startDate: string;
  endDate: string;
  status: "draft" | "scheduled" | "ongoing" | "completed";
};

export type ExaminationSubjectInput = {
  examinationId: number;
  subjectId: number;
  sectionId: number | null;
  maximumMarks: number;
  passingMarks: number;
  allowNegativeMarks: boolean;
};

export type ExamMarkInput = {
  examinationSubjectId: number;
  enrollmentId: number;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string | null;
};

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export async function createExamination(input: ExaminationInput) {
  await requireRole(["admin"]);
  if (!input.name.trim() || !input.examType.trim()) return { error: "Enter an examination name and type." };
  if (!isDate(input.startDate) || !isDate(input.endDate) || input.endDate < input.startDate) return { error: "Enter a valid date range; the end date must be on or after the start date." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("examinations").insert({
    academic_year_id: input.academicYearId,
    class_id: input.classId,
    name: input.name.trim(),
    exam_type: input.examType.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
    created_by: user?.id ?? null,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/admin/examinations");
  return { id: data.id };
}

export async function updateExamination(id: number, input: ExaminationInput) {
  await requireRole(["admin"]);
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid examination." };
  if (!input.name.trim() || !input.examType.trim()) return { error: "Enter an examination name and type." };
  if (!isDate(input.startDate) || !isDate(input.endDate) || input.endDate < input.startDate) return { error: "Enter a valid date range; the end date must be on or after the start date." };
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from("examinations").select("academic_year_id, class_id").eq("id", id).maybeSingle();
  if (currentError) return { error: currentError.message };
  if (!current) return { error: "Examination not found." };
  if (current.academic_year_id !== input.academicYearId || current.class_id !== input.classId) {
    const { data: subjects, error: subjectsError } = await supabase.from("examination_subjects").select("id").eq("examination_id", id);
    if (subjectsError) return { error: subjectsError.message };
    const subjectIds = (subjects ?? []).map((item) => item.id);
    if (subjectIds.length) {
      const { data: marks, error: marksError } = await supabase.from("exam_marks").select("id").in("examination_subject_id", subjectIds).limit(1);
      if (marksError) return { error: marksError.message };
      if (marks?.length) return { error: "Class or academic year cannot change after marks have been entered. Create a new examination instead." };
      return { error: "Remove the configured subjects before changing class or academic year, then configure them again." };
    }
  }
  const { error } = await supabase.from("examinations").update({
    academic_year_id: input.academicYearId,
    class_id: input.classId,
    name: input.name.trim(),
    exam_type: input.examType.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/examinations");
  revalidatePath(`/admin/examinations/${id}`);
  revalidatePath(`/teacher/examinations/${id}`);
  return { success: true };
}

export async function deleteExamination(id: number) {
  await requireRole(["admin"]);
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid examination." };
  const supabase = await createClient();
  const { error } = await supabase.from("examinations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/examinations");
  return { success: true };
}

export async function saveExaminationSubject(input: ExaminationSubjectInput) {
  await requireRole(["admin"]);
  if (!Number.isInteger(input.examinationId) || !Number.isInteger(input.subjectId) || (input.sectionId !== null && !Number.isInteger(input.sectionId))) return { error: "Select a valid examination, subject and section scope." };
  if (!Number.isFinite(input.maximumMarks) || input.maximumMarks <= 0 || !Number.isFinite(input.passingMarks) || input.passingMarks < 0 || input.passingMarks > input.maximumMarks) {
    return { error: "Maximum marks must be positive and passing marks must be between zero and maximum marks." };
  }
  const supabase = await createClient();
  const { data: examination, error: examError } = await supabase.from("examinations").select("class_id").eq("id", input.examinationId).maybeSingle();
  if (examError) return { error: examError.message };
  if (!examination) return { error: "Examination not found." };
  const { data: classSubjects, error: matchingError } = await supabase.from("class_subjects").select("id, section_id").eq("class_id", examination.class_id).eq("subject_id", input.subjectId);
  if (matchingError) return { error: matchingError.message };
  const isOffered = (classSubjects ?? []).some((item) => item.section_id === input.sectionId || (input.sectionId !== null && item.section_id === null));
  if (!isOffered) return { error: "The subject is not assigned to this examination class/section." };
  let configQuery = supabase.from("examination_subjects").select("id").eq("examination_id", input.examinationId).eq("subject_id", input.subjectId);
  configQuery = input.sectionId === null ? configQuery.is("section_id", null) : configQuery.eq("section_id", input.sectionId);
  const { data: currentConfig, error: configError } = await configQuery.maybeSingle();
  if (configError) return { error: configError.message };
  if (currentConfig) {
    const { data: tooHigh, error: maxError } = await supabase.from("exam_marks").select("id").eq("examination_subject_id", currentConfig.id).gt("marks_obtained", input.maximumMarks).limit(1);
    if (maxError) return { error: maxError.message };
    if (tooHigh?.length) return { error: "Maximum marks cannot be lowered below a mark already recorded." };
    if (!input.allowNegativeMarks) {
      const { data: negativeMarks, error: negativeError } = await supabase.from("exam_marks").select("id").eq("examination_subject_id", currentConfig.id).lt("marks_obtained", 0).limit(1);
      if (negativeError) return { error: negativeError.message };
      if (negativeMarks?.length) return { error: "Negative marks are already recorded. Keep negative marks enabled or correct those entries first." };
    }
  }
  const configPayload = {
    examination_id: input.examinationId,
    subject_id: input.subjectId,
    section_id: input.sectionId,
    maximum_marks: input.maximumMarks,
    passing_marks: input.passingMarks,
    allow_negative_marks: input.allowNegativeMarks,
  };
  const { error } = currentConfig
    ? await supabase.from("examination_subjects").update(configPayload).eq("id", currentConfig.id)
    : await supabase.from("examination_subjects").insert(configPayload);
  if (error) return { error: error.message };
  revalidatePath(`/admin/examinations/${input.examinationId}/subjects`);
  revalidatePath(`/teacher/examinations`);
  return { success: true };
}

export async function deleteExaminationSubject(id: number, examinationId: number) {
  await requireRole(["admin"]);
  if (!Number.isInteger(id) || !Number.isInteger(examinationId)) return { error: "Invalid examination subject." };
  const supabase = await createClient();
  const { error } = await supabase.from("examination_subjects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/examinations/${examinationId}/subjects`);
  return { success: true };
}

export async function saveExamMarks(examinationId: number, marks: ExamMarkInput[]) {
  const role = await requireRole(["admin", "teacher"]);
  if (!Number.isInteger(examinationId) || examinationId <= 0) return { error: "Invalid examination." };
  if (marks.length === 0) return { error: "Enter at least one mark or absence before saving." };
  if (marks.some((mark) => !Number.isSafeInteger(mark.examinationSubjectId) || !Number.isSafeInteger(mark.enrollmentId) || typeof mark.isAbsent !== "boolean" || (mark.isAbsent && mark.marksObtained !== null) || (mark.marksObtained !== null && !Number.isFinite(mark.marksObtained)) || (mark.remarks !== null && (typeof mark.remarks !== "string" || mark.remarks.length > 500)))) {
    return { error: "One or more mark entries are invalid." };
  }
  const keys = marks.map((mark) => `${mark.examinationSubjectId}:${mark.enrollmentId}`);
  if (new Set(keys).size !== keys.length) return { error: "Duplicate student mark entries are not allowed." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Sign in again." };
  const payload = marks.map((mark) => ({
    examination_subject_id: mark.examinationSubjectId,
    enrollment_id: mark.enrollmentId,
    marks_obtained: mark.isAbsent ? null : mark.marksObtained,
    is_absent: mark.isAbsent,
    remarks: mark.remarks?.trim() || null,
    ...(role === "admin" ? { updated_by: user.id } : {}),
  }));
  const { error } = await supabase.from("exam_marks").upsert(payload, { onConflict: "examination_subject_id,enrollment_id" });
  if (error) return { error: error.message };
  revalidatePath(`/teacher/examinations/${examinationId}`);
  revalidatePath(`/admin/examinations/${examinationId}/reports`);
  return { success: true };
}
