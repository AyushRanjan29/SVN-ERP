import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import StudentList from "./StudentList";

export default async function StudentsPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();

  const [
    { data: students, error: studentsError },
    { data: enrollments, error: enrollmentsError },
    { data: classes, error: classesError },
    { data: sections, error: sectionsError },
    { data: academicYears, error: yearsError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, admission_number, first_name, last_name, gender, phone")
      .order("id", { ascending: false }),

    supabase
      .from("enrollments")
      .select(
        "student_id, class_id, section_id, academic_year_id, roll_number, status",
      ),

    supabase.from("classes").select("id, name"),

    supabase.from("sections").select("id, name, class_id"),

    supabase.from("academic_years").select("id, name, is_active"),
  ]);

  const error =
    studentsError ||
    enrollmentsError ||
    classesError ||
    sectionsError ||
    yearsError;

  if (error) {
    console.error("Error loading student data:", error.message);

    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Student Management
          </h1>
          <p className="mt-3 text-sm text-red-600">
            Failed to load student data: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const classMap = new Map((classes ?? []).map((item) => [item.id, item.name]));

  const sectionMap = new Map(
    (sections ?? []).map((item) => [item.id, item.name]),
  );

  const yearMap = new Map(
    (academicYears ?? []).map((item) => [item.id, item.name]),
  );

  const activeYear = academicYears?.find((year) => year.is_active);

  const studentRows = (students ?? []).map((student) => {
    const studentEnrollments = (enrollments ?? []).filter(
      (item) => item.student_id === student.id,
    );

    const enrollment =
      studentEnrollments.find(
        (item) => item.academic_year_id === activeYear?.id,
      ) ?? studentEnrollments[0];

    return {
      id: student.id,
      admissionNumber: student.admission_number,
      firstName: student.first_name,
      lastName: student.last_name,
      gender: student.gender,
      phone: student.phone,
      classId: enrollment?.class_id ?? null,
      className: enrollment ? (classMap.get(enrollment.class_id) ?? "—") : "—",
      sectionId: enrollment?.section_id ?? null,
      sectionName: enrollment
        ? (sectionMap.get(enrollment.section_id) ?? "—")
        : "—",
      rollNumber: enrollment?.roll_number ?? null,
      academicYear: enrollment
        ? (yearMap.get(enrollment.academic_year_id) ?? "—")
        : "—",
      status: enrollment?.status ?? "Not enrolled",
    };
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Student Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              View, search and filter registered students.
            </p>
          </div>

          <Link
            href="/admin/students/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Add Student
          </Link>
        </div>

        <StudentList
          students={studentRows}
          classes={classes ?? []}
          sections={sections ?? []}
        />

        <div className="mt-5">
          <Link
            href="/admin"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
