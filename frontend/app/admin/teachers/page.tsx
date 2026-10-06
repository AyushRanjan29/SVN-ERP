import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

import TeacherList from "./TeacherList";

export default async function TeachersPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select(
      "id, employee_id, first_name, last_name, phone, email, qualification, joining_date",
    )
    .order("employee_id", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>

          <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            Unable to load teachers: {error.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-gray-900">Teachers</h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage registered teachers.
            </p>
          </div>

          <Link
            href="/admin/teachers/new"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Teacher
          </Link>
        </div>

        <TeacherList teachers={teachers ?? []} />
      </div>
    </main>
  );
}
