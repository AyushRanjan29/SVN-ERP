import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

type TeacherProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherProfilePage({
  params,
}: TeacherProfilePageProps) {
  await requireRole(["admin"]);

  const { id } = await params;

  const teacherId = Number(id);

  if (!Number.isSafeInteger(teacherId) || teacherId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const { data: teacher, error } = await supabase
    .from("teachers")
    .select(
      `
      id,
      employee_id,
      first_name,
      last_name,
      phone,
      email,
      qualification,
      joining_date,
      created_at,
      updated_at
      `,
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!teacher) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/teachers"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Teachers
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-gray-900">
              Teacher Profile
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Employee ID: {teacher.employee_id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
              Teacher
            </span>

            <Link
              href={`/admin/teachers/${teacher.id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit Teacher
            </Link>
          </div>
        </div>

        {/* Basic Information */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Personal Information
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <InfoItem label="First Name" value={teacher.first_name} />

            <InfoItem label="Last Name" value={teacher.last_name} />

            <InfoItem label="Employee ID" value={teacher.employee_id} />

            <InfoItem label="Phone" value={teacher.phone} />

            <InfoItem label="Email" value={teacher.email} />

            <InfoItem label="Qualification" value={teacher.qualification} />

            <InfoItem
              label="Joining Date"
              value={
                teacher.joining_date
                  ? new Date(teacher.joining_date).toLocaleDateString("en-IN")
                  : null
              }
            />
          </div>
        </section>

        {/* System Information */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            System Information
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <InfoItem label="Teacher ID" value={String(teacher.id)} />

            <InfoItem
              label="Created At"
              value={
                teacher.created_at
                  ? new Date(teacher.created_at).toLocaleString("en-IN")
                  : null
              }
            />

            <InfoItem
              label="Last Updated"
              value={
                teacher.updated_at
                  ? new Date(teacher.updated_at).toLocaleString("en-IN")
                  : null
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>

      <p className="mt-1 text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}
