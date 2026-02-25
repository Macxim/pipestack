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
            status: row.status as any,
            email: row.email,
            phone: row.phone,
            notes: row.notes,
            avatarUrl: row.avatar_url,
            profileUrl: row.profile_url,
            platform: row.platform,
            followUpDate: row.follow_up_date,
          };

          setPipeline((prev) => {
            // Check if lead already exists (to avoid duplicates if we optimistically added it)
            const exists = prev.stages.some(s => s.leads.some(l => l.id === newLead.id));
            if (exists) return prev;

            return {
              ...prev,
              stages: prev.stages.map((stage) =>
                stage.id === row.stage_id
                  ? { ...stage, leads: [...stage.leads, newLead].sort((a, b) => (a as any).position - (b as any).position) }
                  : stage
              ),
            };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new;
          const updatedLead: Lead = {
            id: row.id,
            name: row.name,
            value: row.value,
            status: row.status as any,
            email: row.email,
            phone: row.phone,
            notes: row.notes,
            avatarUrl: row.avatar_url,
            profileUrl: row.profile_url,
            platform: row.platform,
            followUpDate: row.follow_up_date,
          };

          setPipeline((prev) => {
            // Remove lead from old stage and add to new stage if stage_id changed
            let newStages = prev.stages.map(s => ({
              ...s,
              leads: s.leads.filter(l => l.id !== row.id)
            }));

            newStages = newStages.map(s => {
              if (s.id === row.stage_id) {
                return {
                  ...s,
                  leads: [...s.leads, updatedLead]
                    // We don't have position here in the payload row usually if it's not a full row,
                    // but supabase standard broadcast sends full row.
                    .sort((a, b) => (row.position || 0) - (row.position || 0)) // This sort is dummy without all positions
                };
              }
              return s;
            });

            // Better way: find the lead, update it, and move if necessary.
            return {
              ...prev,
              stages: prev.stages.map((stage) => {
                const isTargetStage = stage.id === row.stage_id;
                const containsLead = stage.leads.some(l => l.id === row.id);

                if (isTargetStage && containsLead) {
                  // Just update within the same stage
                  return {
                    ...stage,
                    leads: stage.leads.map(l => l.id === row.id ? updatedLead : l)
                  };
                } else if (isTargetStage) {
                  // Move to this stage
                  return {
                    ...stage,
                    leads: [...stage.leads, updatedLead]
                  };
                } else if (containsLead) {
                  // Remove from this stage
                  return {
                    ...stage,
                    leads: stage.leads.filter(l => l.id !== row.id)
                  };
                }
                return stage;
              })
            };
          });
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

  return <PipelineBoard pipeline={pipeline} onPipelineChange={setPipeline} />;
}