import { createClient } from "@/lib/supabase/server";
import { calculateExamResult, type ExamResult, type SubjectMarkInput } from "./calculations";

export type ExamReportStudent = {
  enrollmentId: number;
  studentId: number;
  name: string;
  admissionNumber: string;
  rollNumber: number | null;
  sectionId: number;
  result: ExamResult;
};

export async function getExaminationReport(examinationId: number, role: "admin" | "teacher", sectionFilter?: number) {
  const supabase = await createClient();
  const { data: exam, error: examError } = await supabase.from("examinations")
    .select("id, academic_year_id, class_id, name, exam_type, start_date, end_date, status")
    .eq("id", examinationId).maybeSingle();
  if (examError) throw new Error(examError.message);
  if (!exam) return null;
  const [configResult, classResult, yearResult] = await Promise.all([
    supabase.from("examination_subjects").select("id, subject_id, section_id, maximum_marks, passing_marks, allow_negative_marks").eq("examination_id", examinationId),
    supabase.from("classes").select("id, name").eq("id", exam.class_id).maybeSingle(),
    supabase.from("academic_years").select("id, name").eq("id", exam.academic_year_id).maybeSingle(),
  ]);
  if (configResult.error || classResult.error || yearResult.error) throw new Error(configResult.error?.message ?? classResult.error?.message ?? yearResult.error?.message);
  let configs = configResult.data ?? [];
  let teacherAssignments: { subject_id: number; section_id: number }[] = [];
  if (role === "teacher") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: teacher, error: teacherError } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
    if (teacherError) throw new Error(teacherError.message);
    if (!teacher) return null;
    const { data, error } = await supabase.from("teacher_assignments").select("subject_id, section_id")
      .eq("teacher_id", teacher.id).eq("class_id", exam.class_id).eq("academic_year_id", exam.academic_year_id);
    if (error) throw new Error(error.message);
    teacherAssignments = (data ?? []).filter((item) => !sectionFilter || item.section_id === sectionFilter);
    const allowedSubjectIds = new Set(teacherAssignments.map((item) => item.subject_id));
    configs = configs.filter((item) => allowedSubjectIds.has(item.subject_id) && (item.section_id === null || teacherAssignments.some((assignment) => assignment.subject_id === item.subject_id && assignment.section_id === item.section_id)));
  }
  if (sectionFilter && role === "admin") {
    const { data: section, error } = await supabase.from("sections").select("id").eq("id", sectionFilter).eq("class_id", exam.class_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!section) return { exam, className: classResult.data?.name ?? "", yearName: yearResult.data?.name ?? "", subjects: [], students: [], sections: [], partial: false };
  }
  if (configs.length === 0) return { exam, className: classResult.data?.name ?? "", yearName: yearResult.data?.name ?? "", subjects: [], students: [], sections: [], partial: role === "teacher" };

  const sectionIds = role === "teacher"
    ? [...new Set(teacherAssignments.map((item) => item.section_id))]
    : sectionFilter ? [sectionFilter] : undefined;
  let enrollmentQuery = supabase.from("enrollments").select("id, student_id, class_id, section_id, academic_year_id, roll_number")
    .eq("class_id", exam.class_id).eq("academic_year_id", exam.academic_year_id).order("roll_number", { ascending: true });
  if (sectionIds) enrollmentQuery = enrollmentQuery.in("section_id", sectionIds);
  const { data: enrollmentData, error: enrollmentError } = await enrollmentQuery;
  if (enrollmentError) throw new Error(enrollmentError.message);
  const enrollments = enrollmentData ?? [];
  if (enrollments.length === 0) return { exam, className: classResult.data?.name ?? "", yearName: yearResult.data?.name ?? "", subjects: [], students: [], sections: [], partial: role === "teacher" };
  const studentIds = [...new Set(enrollments.map((item) => item.student_id))];
  const subjectIds = [...new Set(configs.map((item) => item.subject_id))];
  const examSubjectIds = configs.map((item) => item.id);
  const [studentsResult, subjectResult, sectionResult, marksResult] = await Promise.all([
    supabase.from("students").select("id, admission_number, first_name, last_name").in("id", studentIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("sections").select("id, name").in("id", [...new Set(enrollments.map((item) => item.section_id))]),
    supabase.from("exam_marks").select("examination_subject_id, enrollment_id, marks_obtained, is_absent").in("examination_subject_id", examSubjectIds).in("enrollment_id", enrollments.map((item) => item.id)),
  ]);
  if (studentsResult.error || subjectResult.error || sectionResult.error || marksResult.error) throw new Error(studentsResult.error?.message ?? subjectResult.error?.message ?? sectionResult.error?.message ?? marksResult.error?.message);
  const studentMap = new Map((studentsResult.data ?? []).map((item) => [item.id, item]));
  const subjectMap = new Map((subjectResult.data ?? []).map((item) => [item.id, item.name]));
  const marksMap = new Map((marksResult.data ?? []).map((item) => [`${item.examination_subject_id}:${item.enrollment_id}`, item]));
  const students: ExamReportStudent[] = enrollments.flatMap((enrollment) => {
    const student = studentMap.get(enrollment.student_id);
    if (!student) return [];
    const sectionConfigs = configs.filter((config) => config.section_id === enrollment.section_id);
    const applicableConfigs = configs.filter((config) => config.section_id === null || config.section_id === enrollment.section_id);
    const shadowedClasswideSubjects = new Set(sectionConfigs.map((config) => config.subject_id));
    const scopedConfigs = applicableConfigs.filter((config) => config.section_id !== null || !shadowedClasswideSubjects.has(config.subject_id));
    const studentConfigs = role === "teacher"
      ? scopedConfigs.filter((config) => teacherAssignments.some((assignment) => assignment.subject_id === config.subject_id && assignment.section_id === enrollment.section_id))
      : scopedConfigs;
    const markInputs: SubjectMarkInput[] = studentConfigs.map((config) => {
      const mark = marksMap.get(`${config.id}:${enrollment.id}`);
      return {
        subjectId: config.id,
        subjectName: subjectMap.get(config.subject_id) ?? `Subject ${config.subject_id}`,
        maximumMarks: Number(config.maximum_marks),
        passingMarks: Number(config.passing_marks),
        marksObtained: mark?.marks_obtained === null || mark?.marks_obtained === undefined ? null : Number(mark.marks_obtained),
        isAbsent: mark?.is_absent ?? false,
        allowNegativeMarks: config.allow_negative_marks,
      };
    });
    if (markInputs.length === 0) return [];
    return [{ enrollmentId: enrollment.id, studentId: student.id, name: `${student.first_name} ${student.last_name ?? ""}`.trim(), admissionNumber: student.admission_number, rollNumber: enrollment.roll_number, sectionId: enrollment.section_id, result: calculateExamResult(markInputs) }];
  });
  return {
    exam,
    className: classResult.data?.name ?? "",
    yearName: yearResult.data?.name ?? "",
    subjects: configs.map((config) => ({ id: config.id, subjectId: config.id, name: subjectMap.get(config.subject_id) ?? `Subject ${config.subject_id}`, scopeSectionId: config.section_id, maximumMarks: Number(config.maximum_marks), passingMarks: Number(config.passing_marks) })),
    students,
    sections: sectionResult.data ?? [],
    partial: role === "teacher",
  };
}
