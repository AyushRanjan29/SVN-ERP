import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

import SectionDetails from "./SectionDetails";

type SectionDetailsPageProps = {
  params: Promise<{
    id: string;
    sectionId: string;
  }>;
};

export default async function SectionDetailsPage({
  params,
}: SectionDetailsPageProps) {
  await requireRole(["admin"]);

  const { id, sectionId } = await params;

  const classId = Number(id);
  const sectionIdNumber = Number(sectionId);

  if (
    !Number.isSafeInteger(classId) ||
    classId <= 0 ||
    !Number.isSafeInteger(sectionIdNumber) ||
    sectionIdNumber <= 0
  ) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch class
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    throw new Error(classError.message);
  }

  if (!classData) {
    notFound();
  }

  // Fetch section
  const { data: section, error: sectionError } = await supabase
    .from("sections")
    .select("id, class_id, name")
    .eq("id", sectionIdNumber)
    .eq("class_id", classId)
    .maybeSingle();

  if (sectionError) {
    throw new Error(sectionError.message);
  }

  if (!section) {
    notFound();
  }

  // Fetch curriculum assignments for this section
  const { data: classSubjects, error: classSubjectsError } = await supabase
    .from("class_subjects")
    .select("id, class_id, subject_id, section_id")
    .eq("class_id", classId)
    .eq("section_id", sectionIdNumber)
    .order("id", { ascending: true });

  if (classSubjectsError) {
    throw new Error(classSubjectsError.message);
  }

  // Get subject IDs
  const subjectIds = [
    ...new Set((classSubjects ?? []).map((item) => item.subject_id)),
  ];

  let subjects: {
    id: number;
    name: string;
  }[] = [];

  if (subjectIds.length > 0) {
    const { data, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name")
      .in("id", subjectIds);

    if (subjectsError) {
      throw new Error(subjectsError.message);
    }

    subjects = data ?? [];
  }

  const subjectMap = new Map(
    subjects.map((subject) => [subject.id, subject.name]),
  );

  const assignments = (classSubjects ?? []).map((assignment) => ({
    id: assignment.id,
    subjectId: assignment.subject_id,
    subjectName: subjectMap.get(assignment.subject_id) ?? "Unknown Subject",
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/admin/classes/${classId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to {classData.name}
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Section {section.name}
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            {classData.name} · Section {section.name}
          </p>
        </div>

        <SectionDetails
          classData={classData}
          section={section}
          assignments={assignments}
        />
      </div>
    </main>
  );
}
