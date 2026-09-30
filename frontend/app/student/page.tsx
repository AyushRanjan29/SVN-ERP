import { requireRole } from "@/lib/auth/requireRole";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentDashboard() {
  await requireRole(["student"]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>

        <p className="mt-3 text-gray-600">
          Welcome to the SVN ERP Student Dashboard
        </p>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
