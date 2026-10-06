import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import StudentForm from "./StudentForm";

export default async function NewStudentPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Register New Student
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the student's personal details and academic enrollment.
          </p>

          <div className="mt-8">
            <StudentForm />
          </div>
        </div>
      </div>
    </main>
  );
}
