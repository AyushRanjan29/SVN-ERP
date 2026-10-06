import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import TeacherAssignmentList from "./TeacherAssignmentList";

type TeacherAssignment = {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  section_id: number;
  academic_year_id: number;
};

export default async function TeacherAssignmentsPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();

  const { data: assignments, error } = await supabase
    .from("teacher_assignments")
    .select(
      "id, teacher_id, subject_id, class_id, section_id, academic_year_id",
    )
    .order("id", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">
          Failed to load teacher assignments
        </h1>

        <p className="mt-2 text-sm text-gray-600">{error.message}</p>
      </div>
    );
  }

  const assignmentRows = (assignments ?? []) as TeacherAssignment[];

  const teacherIds = [
    ...new Set(assignmentRows.map((item) => item.teacher_id)),
  ];

  const subjectIds = [
    ...new Set(assignmentRows.map((item) => item.subject_id)),
  ];

  const classIds = [...new Set(assignmentRows.map((item) => item.class_id))];

  const sectionIds = [
    ...new Set(assignmentRows.map((item) => item.section_id)),
  ];

  const academicYearIds = [
    ...new Set(assignmentRows.map((item) => item.academic_year_id)),
  ];

  const [
    { data: teachers },
    { data: subjects },
    { data: classes },
    { data: sections },
    { data: academicYears },
  ] = await Promise.all([
    teacherIds.length
      ? supabase
          .from("teachers")
          .select("id, employee_id, first_name, last_name")
          .in("id", teacherIds)
      : Promise.resolve({ data: [] }),

    subjectIds.length
      ? supabase.from("subjects").select("id, name").in("id", subjectIds)
      : Promise.resolve({ data: [] }),

    classIds.length
      ? supabase.from("classes").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [] }),

    sectionIds.length
      ? supabase
          .from("sections")
          .select("id, name, class_id")
          .in("id", sectionIds)
      : Promise.resolve({ data: [] }),

    academicYearIds.length
      ? supabase
          .from("academic_years")
          .select("id, name")
          .in("id", academicYearIds)
      : Promise.resolve({ data: [] }),
  ]);

  const teacherMap = new Map(
    (teachers ?? []).map((teacher) => [
      teacher.id,
      `${teacher.first_name} ${teacher.last_name ?? ""}`.trim(),
    ]),
  );

  const employeeMap = new Map(
    (teachers ?? []).map((teacher) => [teacher.id, teacher.employee_id]),
  );

  const subjectMap = new Map(
    (subjects ?? []).map((subject) => [subject.id, subject.name]),
  );

  const classMap = new Map((classes ?? []).map((item) => [item.id, item.name]));

  const sectionMap = new Map(
    (sections ?? []).map((item) => [item.id, item.name]),
  );

  const academicYearMap = new Map(
    (academicYears ?? []).map((item) => [item.id, item.name]),
  );

  const rows = assignmentRows.map((assignment) => ({
    id: assignment.id,
    teacherName: teacherMap.get(assignment.teacher_id) ?? "Unknown Teacher",
    employeeId: employeeMap.get(assignment.teacher_id) ?? "—",
    subjectName: subjectMap.get(assignment.subject_id) ?? "Unknown Subject",
    className: classMap.get(assignment.class_id) ?? "Unknown Class",
    sectionName: sectionMap.get(assignment.section_id) ?? "Unknown Section",
    academicYear:
      academicYearMap.get(assignment.academic_year_id) ?? "Unknown Year",
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Teacher Assignments
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Manage teachers assigned to subjects, classes and sections.
          </p>
        </div>

        <a
          href="/admin/teacher-assignments/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Assignment
        </a>
      </div>

      <TeacherAssignmentList assignments={rows} />
    </div>
  );
}
