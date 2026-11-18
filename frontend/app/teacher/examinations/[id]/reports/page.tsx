import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { getExaminationReport } from "@/lib/exams/serverData";
import ExaminationReport from "@/app/exams/ExaminationReport";

export default async function TeacherExaminationReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["teacher"]);
  const { id } = await params;
  const examinationId = Number(id);
  if (!Number.isSafeInteger(examinationId) || examinationId <= 0) notFound();
  const result = await loadReport(examinationId);
  if (result.error) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to calculate assigned examination results: {result.error}</div><Link className="mt-4 inline-block text-sm text-indigo-600" href="/teacher/examinations">Back to assigned examinations</Link></main>;
  const report = result.report;
  if (!report) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl"><ExaminationReport examName={report.exam.name} examType={report.exam.exam_type} className={report.className} yearName={report.yearName} subjects={report.subjects} students={report.students} sections={report.sections} partial={report.partial} cardBaseHref={`/teacher/examinations/${report.exam.id}/reports`} backHref="/teacher/examinations" /></div></main>;
}

async function loadReport(id: number) {
  try { return { report: await getExaminationReport(id, "teacher"), error: null }; }
  catch (error) { return { report: null, error: error instanceof Error ? error.message : "Unknown error" }; }
}
