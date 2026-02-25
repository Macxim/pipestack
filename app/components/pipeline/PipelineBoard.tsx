"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Pipeline, Lead } from "@/app/types/pipeline";
import StageColumn from "./StageColumn";
import LeadDetailPanel from "./LeadDetailPanel";
import AddStageButton from "./AddStageButton";

type Props = {
  pipeline: Pipeline;
  onPipelineChange: (updated: Pipeline) => void;
};

type SelectedLead = {
  lead: Lead;
  stageName: string;
};

export default function PipelineBoard({ pipeline, onPipelineChange }: Props) {
  const [selected, setSelected] = useState<SelectedLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findStageOfLead = (leadId: string) =>
    pipeline.stages.find((s) => s.leads.some((l) => l.id === leadId));

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeStage = findStageOfLead(active.id as string);
    const overStage =
      findStageOfLead(over.id as string) ||
      pipeline.stages.find((s) => s.id === over.id);

    if (!activeStage || !overStage || activeStage.id === overStage.id) return;

    const activeLead = activeStage.leads.find((l) => l.id === active.id)!;

    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => {
        if (stage.id === activeStage.id)
          return { ...stage, leads: stage.leads.filter((l) => l.id !== active.id) };
        if (stage.id === overStage.id)
          return { ...stage, leads: [...stage.leads, activeLead] };
        return stage;
      }),
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeStage = findStageOfLead(active.id as string);
    const overStage = findStageOfLead(over.id as string) || pipeline.stages.find(s => s.id === over.id);

    if (!activeStage || !overStage) return;

    let updatedPipeline = pipeline;

    if (activeStage.id === overStage.id) {
      const { arrayMove } = await import("@dnd-kit/sortable");
      const oldIndex = activeStage.leads.findIndex((l) => l.id === active.id);
      const newIndex = overStage.leads.findIndex((l) => l.id === over.id);

      if (oldIndex !== newIndex && newIndex !== -1) {
        updatedPipeline = {
          ...pipeline,
          stages: pipeline.stages.map((stage) =>
            stage.id === activeStage.id
              ? { ...stage, leads: arrayMove(stage.leads, oldIndex, newIndex) }
              : stage
          ),
        };
        onPipelineChange(updatedPipeline);
      }
    }

    // Persist changes
    const affectedStages = updatedPipeline.stages.filter(s => s.id === activeStage.id || s.id === overStage.id);
    const leadsToPersist = affectedStages.flatMap(s =>
      s.leads.map((l, index) => ({
        id: l.id,
        stageId: s.id,
        position: index
      }))
    );

    try {
      const res = await fetch("/api/leads/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: leadsToPersist }),
      });
      if (!res.ok) throw new Error("Failed to persist reorder");
    } catch (err) {
      console.error("Persistence error:", err);
    }
  };

  const handleCardClick = (lead: Lead, stageName: string) => {
    setSelected({ lead, stageName });
  };

  const handleSave = async (updated: Lead) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save lead");
      }

      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.map((stage) => ({
          ...stage,
          leads: stage.leads.map((l) => (l.id === updated.id ? updated : l)),
        })),
      });
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleAddStage = (title: string) => {
    const STAGE_COLORS = [
      "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899",
      "#ef4444", "#10b981", "#06b6d4", "#f97316",
    ];
    const newStage = {
      id: `stage-${Date.now()}`,
      title,
      color: STAGE_COLORS[pipeline.stages.length % STAGE_COLORS.length],
      leads: [],
    };
    onPipelineChange({
      ...pipeline,
      stages: [...pipeline.stages, newStage],
    });
  };

  const handleDeleteStage = (stageId: string) => {
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.filter((s) => s.id !== stageId),
    });
  };

  const handleRenameStage = (stageId: string, newTitle: string) => {
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((s) =>
        s.id === stageId ? { ...s, title: newTitle } : s
      ),
    });
  };

  const handleLeadDelete = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads?id=${leadId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete lead");
      }

      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.map((stage) => ({
          ...stage,
          leads: stage.leads.filter((l) => l.id !== leadId),
        })),
      });
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete lead. Please try again.");
    }
  };

  return (
    <>
      <DndContext
        id="pipeline-dnd-context"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6">
          {pipeline.stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              onCardClick={(lead) => handleCardClick(lead, stage.title)}
              onDelete={handleDeleteStage}
              onRename={handleRenameStage}
              onLeadDelete={handleLeadDelete}
            />
          ))}
          <AddStageButton onAdd={handleAddStage} />
        </div>
      </DndContext>

      {selected && (
        <LeadDetailPanel
          lead={selected.lead}
          stageName={selected.stageName}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}