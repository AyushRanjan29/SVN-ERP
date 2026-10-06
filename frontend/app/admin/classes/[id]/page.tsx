import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

import ClassDetails from "./ClassDetails";

type ClassDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassDetailsPage({
  params,
}: ClassDetailsPageProps) {
  await requireRole(["admin"]);

  const { id } = await params;

  const classId = Number(id);

  if (!Number.isSafeInteger(classId) || classId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch class
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("id, name, description")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    throw new Error(classError.message);
  }

  if (!classData) {
    notFound();
  }

  // Fetch sections
  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id, class_id, name")
    .eq("class_id", classId)
    .order("id", { ascending: true });

  if (sectionsError) {
    throw new Error(sectionsError.message);
  }

  // Fetch class-subject assignments
  const { data: classSubjects, error: classSubjectsError } =
    await supabase
      .from("class_subjects")
      .select("id, class_id, subject_id, section_id")
      .eq("class_id", classId)
      .order("id", { ascending: true });

  if (classSubjectsError) {
    throw new Error(classSubjectsError.message);
  }

  // Get all subject IDs used by this class
  const subjectIds = [
    ...new Set(
      (classSubjects ?? []).map(
        (item) => item.subject_id
      )
    ),
  ];

  // Fetch subject names separately
  const { data: subjects, error: subjectsError } =
    await supabase
      .from("subjects")
      .select("id, name")
      .in("id", subjectIds);

  if (subjectsError) {
    throw new Error(subjectsError.message);
  }

  // Create subject ID → subject name lookup
  const subjectMap = new Map(
    (subjects ?? []).map((subject) => [
      subject.id,
      subject.name,
    ])
  );

  // Add subject name to every assignment
  const assignments = (classSubjects ?? []).map(
    (assignment) => ({
      id: assignment.id,
      class_id: assignment.class_id,
      subject_id: assignment.subject_id,
      section_id: assignment.section_id,
      subjectName:
        subjectMap.get(assignment.subject_id) ??
        "Unknown Subject",
    })
  );

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/admin/classes"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Classes
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {classData.name}
          </h1>

          {classData.description && (
            <p className="mt-1 text-sm text-gray-600">
              {classData.description}
            </p>
          )}
        </div>

        <ClassDetails
          classData={classData}
          sections={sections ?? []}
          classSubjects={assignments}
        />
      </div>
    </main>
  );
}