import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AppShell from "@/app/components/layout/AppShell";
import CsvImporter from "@/app/components/import/CsvImporter";

export default async function ImportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's pipeline for AppShell
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id, title")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!pipeline) redirect("/onboarding");

  return (
    <AppShell title="Import Leads" pipelineId={pipeline.id} isEditable={false}>
      <CsvImporter />
    </AppShell>
  );
}
