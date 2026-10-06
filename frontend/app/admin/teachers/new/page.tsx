import { requireRole } from "@/lib/auth/requireRole";
import TeacherForm from "./TeacherForm";


export default async function NewTeacherPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <a
            href="/admin/teachers"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Teachers
          </a>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">Add Teacher</h1>

          <p className="mt-1 text-sm text-gray-600">
            Register a new teacher in the school system.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <TeacherForm />
        </div>
      </div>
    </main>
  );
}
