import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { getExaminationReport } from "@/lib/exams/serverData";
import ExaminationReport from "@/app/exams/ExaminationReport";

export default async function AdminExaminationReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await params;
  const examinationId = Number(id);
  if (!Number.isSafeInteger(examinationId) || examinationId <= 0) notFound();
  const result = await loadReport(examinationId);
  if (result.error) return <main className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to calculate examination results: {result.error}</div><Link className="mt-4 inline-block text-sm text-indigo-600" href="/admin/examinations">Back to examinations</Link></main>;
  const report = result.report;
  if (!report) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl"><ExaminationReport examName={report.exam.name} examType={report.exam.exam_type} className={report.className} yearName={report.yearName} subjects={report.subjects} students={report.students} sections={report.sections} partial={false} cardBaseHref={`/admin/examinations/${report.exam.id}/reports`} backHref="/admin/examinations" /></div></main>;
}

async function loadReport(id: number) {
  try { return { report: await getExaminationReport(id, "admin"), error: null }; }
  catch (error) { return { report: null, error: error instanceof Error ? error.message : "Unknown error" }; }
}
