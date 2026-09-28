import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("test_connection").select("*");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div>
        <h1 className="text-3xl font-bold">SVN ERP</h1>

        <p className="mt-4">Supabase connection test</p>

        <pre className="mt-4">{JSON.stringify({ data, error }, null, 2)}</pre>
      </div>
    </main>
  );
}
