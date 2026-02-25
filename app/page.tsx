import { redirect } from "next/navigation";
import AppShell from "./components/layout/AppShell";
import PipelineBoardWrapper from "./components/pipeline/PipelineBoardWrapper";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Pipeline } from "./types/pipeline";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get this user's pipeline
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  // No pipeline yet → onboarding
  if (!pipeline) redirect("/onboarding");

  const { data: stages } = await supabase
    .from("stages")
    .select(`*, leads (*)`)
    .eq("pipeline_id", pipeline.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const pipelineData: Pipeline = {
    id: pipeline.id,
    title: pipeline.title,
    stages: (stages ?? []).map((stage) => ({
      id: stage.id,
      title: stage.title,
      color: stage.color,
      leads: (stage.leads ?? [])
        .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        .map((lead: any) => ({
          id: lead.id,
          name: lead.name,
          value: lead.value,
          status: lead.status,
          email: lead.email,
          phone: lead.phone,
          notes: lead.notes,
          avatarUrl: lead.avatar_url,
          profileUrl: lead.profile_url,
          platform: lead.platform,
          followUpDate: lead.follow_up_date,
        })),
    })),
  };

  return (
    <AppShell title={pipelineData.title} pipelineId={pipelineData.id}>
      <PipelineBoardWrapper initialPipeline={pipelineData} />
    </AppShell>
  );
}