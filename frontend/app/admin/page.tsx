import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminDashboard() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome to the SVN ERP Admin Dashboard
            </p>
          </div>
          <LogoutButton />
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/students/new"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Register Student
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Add a new student and assign their class and section.
            </p>
            <span className="mt-5 inline-block text-sm font-medium text-blue-600">
              Add student →
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
