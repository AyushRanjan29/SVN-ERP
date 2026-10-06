import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import EditTeacherAssignmentForm from "./EditTeacherAssignmentForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTeacherAssignmentPage({ params }: Props) {
  await requireRole(["admin"]);

  const { id } = await params;

  const assignmentId = Number(id);

  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const [
    { data: assignment },
    { data: teachers },
    { data: subjects },
    { data: classes },
    { data: sections },
    { data: academicYears },
    { data: classSubjects },
  ] = await Promise.all([
    supabase
      .from("teacher_assignments")
      .select(
        "id, teacher_id, subject_id, class_id, section_id, academic_year_id",
      )
      .eq("id", assignmentId)
      .maybeSingle(),

    supabase
      .from("teachers")
      .select("id, employee_id, first_name, last_name")
      .order("employee_id"),

    supabase.from("subjects").select("id, name").order("name"),

    supabase.from("classes").select("id, name").order("id"),

    supabase
      .from("sections")
      .select("id, class_id, name")
      .order("class_id")
      .order("name"),

    supabase
      .from("academic_years")
      .select("id, name")
      .order("id", { ascending: false }),

    supabase
      .from("class_subjects")
      .select("id, class_id, subject_id, section_id"),
  ]);

  if (!assignment) {
    notFound();
  }

  return (
    <div className="p-6">
      <EditTeacherAssignmentForm
        assignment={assignment}
        teachers={teachers ?? []}
        subjects={subjects ?? []}
        classes={classes ?? []}
        sections={sections ?? []}
        academicYears={academicYears ?? []}
        classSubjects={classSubjects ?? []}
      />
    </div>
  );
}
