"use client";

import { useEffect, useState, forwardRef } from "react";
import { supabase } from "@/lib/supabase";
import PipelineBoard, { PipelineBoardHandle } from "./PipelineBoard";
import { Pipeline, Lead } from "@/app/types/pipeline";

type Props = {
  initialPipeline: Pipeline;
};

const PipelineBoardWrapper = forwardRef<PipelineBoardHandle, Props>(
  ({ initialPipeline }, ref) => {
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
                      .sort((a, b) => (row.position || 0) - (row.position || 0))
                  };
                }
                return s;
              });

              return {
                ...prev,
                stages: prev.stages.map((stage) => {
                  const isTargetStage = stage.id === row.stage_id;
                  const containsLead = stage.leads.some(l => l.id === row.id);

                  if (isTargetStage && containsLead) {
                    return {
                      ...stage,
                      leads: stage.leads.map(l => l.id === row.id ? updatedLead : l)
                    };
                  } else if (isTargetStage) {
                    return {
                      ...stage,
                      leads: [...stage.leads, updatedLead]
                    };
                  } else if (containsLead) {
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

    return <PipelineBoard ref={ref} pipeline={pipeline} onPipelineChange={setPipeline} />;
  }
);

PipelineBoardWrapper.displayName = "PipelineBoardWrapper";

export default PipelineBoardWrapper;