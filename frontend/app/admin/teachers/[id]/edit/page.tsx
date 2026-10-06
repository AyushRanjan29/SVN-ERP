import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

import EditTeacherForm from "./EditTeacherForm";

type EditTeacherPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTeacherPage({
  params,
}: EditTeacherPageProps) {
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
      joining_date
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
      <div className="mx-auto max-w-4xl">
        <EditTeacherForm teacher={teacher} />
      </div>
    </main>
  );
}
