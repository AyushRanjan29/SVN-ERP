import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10).split("-").reverse().join("/");
}

export default async function StudentDetailsPage({ params }: Props) {
  await requireRole(["admin"]);

  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      `id, admission_number, first_name, last_name, date_of_birth,
       gender, phone, address, guardian_name, guardian_phone,
       admission_date, created_at`,
    )
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white p-6">
          <p className="text-red-600">
            Failed to load student: {studentError.message}
          </p>
        </div>
      </main>
    );
  }

  if (!student) notFound();

  const [
    { data: enrollments, error: enrollmentError },
    { data: classes, error: classesError },
    { data: sections, error: sectionsError },
    { data: academicYears, error: yearsError },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, student_id, academic_year_id, class_id, section_id, roll_number, enrollment_date, status",
      )
      .eq("student_id", studentId)
      .order("enrollment_date", { ascending: false }),

    supabase.from("classes").select("id, name"),

    supabase.from("sections").select("id, name, class_id"),

    supabase.from("academic_years").select("id, name, is_active"),
  ]);

  const enrollmentDataError =
    enrollmentError || classesError || sectionsError || yearsError;

  const classMap = new Map((classes ?? []).map((item) => [item.id, item.name]));

  const sectionMap = new Map(
    (sections ?? []).map((item) => [item.id, item.name]),
  );

  const yearMap = new Map(
    (academicYears ?? []).map((item) => [item.id, item.name]),
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/students"
              className="mb-2 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Students
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Student Profile
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Admission No: {student.admission_number}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
              Student
            </span>

            <Link
              href={`/admin/students/${student.id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit Student
            </Link>
          </div>
        </div>

        {/* Personal Information */}
        <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-800">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                First Name
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {student.first_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Last Name
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {student.last_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Gender
              </p>
              <p className="mt-1 font-medium capitalize text-gray-900">
                {student.gender || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Date of Birth
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {formatDate(student.date_of_birth)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Phone
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {student.phone || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Admission Date
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {formatDate(student.admission_date)}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase text-gray-500">
                Address
              </p>
              <p className="mt-1 whitespace-pre-wrap font-medium text-gray-900">
                {student.address || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Guardian Information */}
        <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-800">
              Guardian Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Guardian Name
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {student.guardian_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Guardian Phone
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {student.guardian_phone || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Enrollment History */}
        <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-800">Enrollment History</h2>
          </div>

          {enrollmentDataError ? (
            <p className="p-6 text-sm text-red-600">
              Failed to load enrollment details: {enrollmentDataError.message}
            </p>
          ) : !enrollments || enrollments.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">
              No enrollment records found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3">
                      Academic Year
                    </th>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Section</th>
                    <th className="whitespace-nowrap px-5 py-3">Roll Number</th>
                    <th className="whitespace-nowrap px-5 py-3">
                      Enrollment Date
                    </th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-5 py-4 text-gray-800">
                        {yearMap.get(enrollment.academic_year_id) ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-800">
                        {classMap.get(enrollment.class_id) ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-800">
                        {sectionMap.get(enrollment.section_id) ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-800">
                        {enrollment.roll_number ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {formatDate(enrollment.enrollment_date)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium capitalize text-green-700">
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div>
          <Link
            href="/admin/students"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Student List
          </Link>
        </div>
      </div>
    </main>
  );
}
