import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";
import TeacherAssignmentForm from "./TeacherAssignmentForm";

export default async function NewTeacherAssignmentPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();

  const [
    { data: teachers },
    { data: subjects },
    { data: classes },
    { data: sections },
    { data: academicYears },
    { data: classSubjects },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, employee_id, first_name, last_name")
      .order("employee_id"),

    supabase
      .from("subjects")
      .select("id, name")
      .order("name"),

    supabase
      .from("classes")
      .select("id, name")
      .order("id"),

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

  return (
    <div className="p-6">
      <TeacherAssignmentForm
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