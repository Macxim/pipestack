import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AppShell from "@/app/components/layout/AppShell";
import AddLeadForm from "@/app/components/leads/AddLeadForm";

export default async function AddLeadPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's pipeline
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id, title")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!pipeline) redirect("/onboarding");

  // Get stages for the stage selector
  const { data: stages } = await supabase
    .from("stages")
    .select("id, title, color, position")
    .eq("pipeline_id", pipeline.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  return (
    <AppShell title="Add a Lead" pipelineId={pipeline.id} isEditable={false}>
      <AddLeadForm stages={stages ?? []} />
    </AppShell>
  );
}
