"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PipelineBoard from "./PipelineBoard";
import { Pipeline, Lead } from "@/app/types/pipeline";

type Props = {
  initialPipeline: Pipeline;
};

export default function PipelineBoardWrapper({ initialPipeline }: Props) {
  const [pipeline, setPipeline] = useState(initialPipeline);

  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new;
          const newLead: Lead = {
            id: row.id,
            name: row.name,
            value: row.value,
            status: row.status,
            email: row.email,
            phone: row.phone,
            notes: row.notes,
            avatarUrl: row.avatar_url,
            profileUrl: row.profile_url,
            platform: row.platform,
            followUpDate: row.follow_up_date,
          };

          setPipeline((prev) => ({
            ...prev,
            stages: prev.stages.map((stage) =>
              stage.id === row.stage_id
                ? { ...stage, leads: [...stage.leads, newLead] }
                : stage
            ),
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.old;
          setPipeline((prev) => ({
            ...prev,
            stages: prev.stages.map((stage) => ({
              ...stage,
              leads: stage.leads.filter((lead) => lead.id !== row.id),
            })),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <PipelineBoard pipeline={pipeline} />;
}