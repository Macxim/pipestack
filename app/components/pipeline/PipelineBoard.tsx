"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
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

const STAGE_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899",
  "#ef4444", "#10b981", "#06b6d4", "#f97316",
];

export default function PipelineBoard({ pipeline, onPipelineChange }: Props) {
  const [selected, setSelected] = useState<SelectedLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findStageOfLead = (leadId: string) =>
    pipeline.stages.find((s) => s.leads.some((l) => l.id === leadId));

  // ─── Drag and drop ──────────────────────────────────────────────

  // Track where the lead originally came from before DragOver moves it
  const dragSourceStageId = useRef<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const stage = findStageOfLead(event.active.id as string);
    dragSourceStageId.current = stage?.id ?? null;
  };

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const sourceStageId = dragSourceStageId.current;
    dragSourceStageId.current = null;

    if (!over) return;

    const activeStage = findStageOfLead(active.id as string);
    if (!activeStage) return;

    // Same-column reorder
    if (activeStage.id === (findStageOfLead(over.id as string)?.id)) {
      const oldIndex = activeStage.leads.findIndex((l) => l.id === active.id);
      const newIndex = activeStage.leads.findIndex((l) => l.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newLeads = arrayMove(activeStage.leads, oldIndex, newIndex);

        onPipelineChange({
          ...pipeline,
          stages: pipeline.stages.map((stage) =>
            stage.id === activeStage.id ? { ...stage, leads: newLeads } : stage
          ),
        });
      }
    }

    // Persist: collect leads from all affected stages (source + destination)
    const affectedStageIds = new Set<string>();
    affectedStageIds.add(activeStage.id);
    if (sourceStageId && sourceStageId !== activeStage.id) {
      affectedStageIds.add(sourceStageId);
    }

    // Use the latest pipeline state after any reorder above
    const latestPipeline = pipeline;
    const leadsToPersist = latestPipeline.stages
      .filter((s) => affectedStageIds.has(s.id))
      .flatMap((s) =>
        s.leads.map((l, i) => ({ id: l.id, stageId: s.id, position: i }))
      );

    if (leadsToPersist.length > 0) {
      fetch("/api/leads/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: leadsToPersist }),
      }).catch(console.error);
    }
  };

  // ─── Lead actions ───────────────────────────────────────────────

  const handleCardClick = (lead: Lead, stageName: string) => {
    setSelected({ lead, stageName });
  };

  const handleSaveLead = (updated: Lead) => {
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        leads: stage.leads.map((l) => (l.id === updated.id ? updated : l)),
      })),
    });
  };

  const handleLeadDelete = async (leadId: string) => {
    // Optimistic
    const prev = pipeline;
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        leads: stage.leads.filter((l) => l.id !== leadId),
      })),
    });

    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    } catch {
      onPipelineChange(prev); // Rollback
      alert("Failed to delete lead. Please try again.");
    }
  };

  // ─── Stage actions ──────────────────────────────────────────────

  const handleAddStage = async (title: string) => {
    const color = STAGE_COLORS[pipeline.stages.length % STAGE_COLORS.length];

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    onPipelineChange({
      ...pipeline,
      stages: [...pipeline.stages, { id: tempId, title, color, leads: [] }],
    });

    try {
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, color, pipelineId: pipeline.id }),
      });
      const data = await res.json();

      // Replace temp ID with real one from DB
      onPipelineChange({
        ...pipeline,
        stages: [...pipeline.stages.filter((s) => s.id !== tempId), { id: data.stage.id, title, color, leads: [] }],
      });
    } catch {
      // Rollback on failure
      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.filter((s) => s.id !== tempId),
      });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const stage = pipeline.stages.find((s) => s.id === stageId);
    if (!stage) return;

    if (stage.leads.length > 0) {
      const confirmed = confirm(
        `"${stage.title}" has ${stage.leads.length} lead(s). Delete the column and all its leads?`
      );
      if (!confirmed) return;
    }

    // Optimistic
    const prev = pipeline;
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.filter((s) => s.id !== stageId),
    });

    try {
      await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    } catch {
      onPipelineChange(prev); // Rollback
    }
  };

  const handleRenameStage = async (stageId: string, newTitle: string) => {
    const oldStage = pipeline.stages.find((s) => s.id === stageId);
    if (!oldStage) return;

    // Optimistic
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((s) =>
        s.id === stageId ? { ...s, title: newTitle } : s
      ),
    });

    try {
      await fetch(`/api/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch {
      // Rollback
      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.map((s) =>
          s.id === stageId ? { ...s, title: oldStage.title } : s
        ),
      });
    }
  };

  return (
    <>
      <DndContext
        id="pipeline-dnd-context"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
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
          onSave={handleSaveLead}
        />
      )}
    </>
  );
}