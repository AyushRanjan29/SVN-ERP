import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import EditStudentForm from "../EditStudentForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditStudentPage({ params }: Props) {
  await requireRole(["admin"]);

  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id, first_name, last_name, date_of_birth, gender, phone, address, guardian_name, guardian_phone, admission_date"
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-6">
          <p className="text-sm text-red-600">
            Failed to load student: {error.message}
          </p>
        </div>
      </main>
    );
  }

  if (!student) notFound();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/admin/students/${student.id}`}
            className="mb-2 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Student Profile
          </Link>

          <h1 className="text-2xl font-bold text-gray-900">
            Edit Student
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Update the details for {student.first_name}{" "}
            {student.last_name ?? ""}.
          </p>
        </div>

        <EditStudentForm student={student} />
      </div>
    </main>
  );
}

