import { notFound } from "next/navigation";
import ReportCardPage from "@/app/exams/ReportCardPage";

export default async function AdminStudentReportCardPage({ params, searchParams }: { params: Promise<{ id: string; studentId: string }>; searchParams: Promise<{ section?: string }> }) {
  const [{ id, studentId }, query] = await Promise.all([params, searchParams]);
  const examinationId = Number(id);
  const studentKey = Number(studentId);
  const sectionId = query.section ? Number(query.section) : undefined;
  if (!Number.isSafeInteger(examinationId) || !Number.isSafeInteger(studentKey) || (sectionId !== undefined && !Number.isSafeInteger(sectionId))) notFound();
  return <ReportCardPage role="admin" examinationId={examinationId} studentId={studentKey} sectionId={sectionId} />;
}
