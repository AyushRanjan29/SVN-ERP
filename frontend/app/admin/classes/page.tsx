import Link from "next/link";

import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

import ClassList from "./ClassList";

export default async function ClassesPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();

  const [
    { data: classes, error: classesError },
    { data: sections, error: sectionsError },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, description")
      .order("id", { ascending: true }),

    supabase
      .from("sections")
      .select("id, class_id, name")
      .order("class_id", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (classesError) {
    throw new Error(classesError.message);
  }

  if (sectionsError) {
    throw new Error(sectionsError.message);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">Classes</h1>

          <p className="mt-1 text-sm text-gray-600">
            View classes, sections and curriculum.
          </p>
        </div>

        <ClassList classes={classes ?? []} sections={sections ?? []} />
      </div>
    </main>
  );
}
