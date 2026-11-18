import { requireRole } from "@/lib/auth/requireRole";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function TeacherDashboard() {
  await requireRole(["teacher"]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>

        <p className="mt-3 text-gray-600">
          Welcome to the SVN ERP Teacher Dashboard
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/teacher/attendance" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Take attendance</Link>
          <Link href="/teacher/examinations" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Examinations</Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
