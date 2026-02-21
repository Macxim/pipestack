import AppShell from "./components/layout/AppShell";
import PipelineBoard from "./components/pipeline/PipelineBoard";
import { supabase } from "@/lib/supabase";
import { Pipeline } from "./types/pipeline";

export default async function Home() {
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("*")
    .limit(1)
    .single();

  const { data: stages } = await supabase
    .from("stages")
    .select(`
      *,
      leads (*)
    `)
    .eq("pipeline_id", pipeline.id)
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
        .map((lead: {
          id: string;
          name: string;
          value: number;
          status: string;
          email?: string;
          phone?: string;
          notes?: string;
          avatar_url?: string;
          profile_url?: string;
          platform?: string;
          follow_up_date?: string;
        }) => ({
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
    <AppShell>
      <PipelineBoard pipeline={pipelineData} />
    </AppShell>
  );
}