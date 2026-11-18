import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import { getExaminationReport } from "@/lib/exams/serverData";
import PrintReportCard from "./PrintReportCard";

export default async function ReportCardPage({ role, examinationId, studentId, sectionId }: { role: "admin" | "teacher"; examinationId: number; studentId: number; sectionId?: number }) {
  await requireRole([role]);
  if (!Number.isSafeInteger(examinationId) || examinationId <= 0 || !Number.isSafeInteger(studentId) || studentId <= 0) notFound();
  const report = await getExaminationReport(examinationId, role, sectionId);
  if (!report) notFound();
  const student = report.students.find((item) => item.studentId === studentId);
  if (!student) notFound();
  const sectionName = report.sections.find((item) => item.id === student.sectionId)?.name ?? "—";
  const supabase = await createClient();
  const { data: attendance, error } = await supabase.from("attendance_records")
    .select("status")
    .eq("enrollment_id", student.enrollmentId)
    .gte("attendance_date", report.exam.start_date)
    .lte("attendance_date", report.exam.end_date);
  const attendanceSummary = error ? null : {
    "Marked days": attendance?.length ?? 0,
    Present: attendance?.filter((item) => item.status === "present").length ?? 0,
    Late: attendance?.filter((item) => item.status === "late").length ?? 0,
    Absent: attendance?.filter((item) => item.status === "absent").length ?? 0,
    Leave: attendance?.filter((item) => item.status === "leave").length ?? 0,
    "Half day": attendance?.filter((item) => item.status === "half_day").length ?? 0,
  };
  return <PrintReportCard schoolName="Saraswati Vidya Niketan" examName={report.exam.name} examType={report.exam.exam_type} yearName={report.yearName} className={report.className} sectionName={sectionName} student={student} result={student.result} partial={report.partial} attendance={attendanceSummary} />;
}
