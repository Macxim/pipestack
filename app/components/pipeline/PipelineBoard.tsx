"use client";

import { forwardRef, useImperativeHandle, useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { Pipeline, Lead, Stage } from "@/app/types/pipeline";
import StageColumn from "./StageColumn";
import LeadCard from "./LeadCard";
import AddStageButton from "./AddStageButton";
import LeadDetailPanel from "./LeadDetailPanel";
import BulkActionBar from "./BulkActionBar";
import { getFollowUpCounts } from "@/lib/follow-up-counts";
import { useFollowUpCounts } from "@/app/context/FollowUpContext";
import FollowUpBar from "./FollowUpBar";

type Props = {
  pipeline: Pipeline;
  onPipelineChange: (updated: Pipeline) => void;
};

export type SelectedLead = {
  lead: Lead;
  stageName: string;
};

export type PipelineBoardHandle = {
  openLead: (leadId: string) => void;
};

type ActiveDrag =
  | { type: "card"; lead: Lead }
  | { type: "column"; stage: Stage }
  | null;

const STAGE_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899",
  "#ef4444", "#10b981", "#06b6d4", "#f97316",
];

const PipelineBoard = forwardRef<PipelineBoardHandle, Props>(
  ({ pipeline, onPipelineChange }, ref) => {
  const [selected, setSelected] = useState<SelectedLead | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [showingDueOnly, setShowingDueOnly] = useState(false);

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Derived selection values
  const isSelecting = selectedLeadIds.size > 0;
  const selectedCount = selectedLeadIds.size;
  const allLeads = useMemo(() => pipeline.stages.flatMap((s) => s.leads), [pipeline.stages]);
  const selectedLeads = useMemo(() => allLeads.filter((l) => selectedLeadIds.has(l.id)), [allLeads, selectedLeadIds]);

  const { setCounts, setPipeline } = useFollowUpCounts();
  const counts = useMemo(() => getFollowUpCounts(pipeline), [pipeline]);

  useEffect(() => {
    setCounts(counts);
    setPipeline(pipeline);
  }, [counts, pipeline, setCounts, setPipeline]);

  // Auto-clear filter
  useEffect(() => {
    if (showingDueOnly && counts.total === 0) {
      setShowingDueOnly(false);
    }
  }, [counts.total, showingDueOnly]);

  // Document title updates
  useEffect(() => {
    if (counts.total === 0) {
      document.title = "Pipestack";
    } else {
      document.title = `(${counts.total}) Pipestack`;
    }
    return () => { document.title = "Pipestack"; };
  }, [counts.total]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useImperativeHandle(ref, () => ({
    openLead: (leadId: string) => {
      const allLeadsUnderRef = pipeline.stages.flatMap((s) =>
        s.leads.map((l) => ({ lead: l, stageName: s.title }))
      );
      const found = allLeadsUnderRef.find((x) => x.lead.id === leadId);
      if (found) setSelected(found);
    },
  }));

  // Handle pending lead from session storage (cross-page navigation)
  useEffect(() => {
    const pendingLeadId = sessionStorage.getItem("pipestack_open_lead");
    if (pendingLeadId) {
      sessionStorage.removeItem("pipestack_open_lead");
      // Small delay to let the board render first
      setTimeout(() => {
        const allLeadsUnderEffect = pipeline.stages.flatMap((s) =>
          s.leads.map((l) => ({ lead: l, stageName: s.title }))
        );
        const found = allLeadsUnderEffect.find((x) => x.lead.id === pendingLeadId);
        if (found) setSelected(found);
      }, 100);
    }
  }, [pipeline.stages]);


  // ─── Helpers ───────────────────────────────────────────────────

  const findStageOfLead = useCallback(
    (leadId: string) =>
      pipeline.stages.find((s) => s.leads.some((l) => l.id === leadId)),
    [pipeline.stages]
  );

  const toggleLead = (id: string) => {
    if (selected) setSelected(null);
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = useCallback(() => {
    setSelectedLeadIds(new Set(allLeads.map((l) => l.id)));
  }, [allLeads]);

  const selectAllInStage = (stageId: string) => {
    const stage = pipeline.stages.find((s) => s.id === stageId);
    if (!stage) return;
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      stage.leads.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const deselectAllInStage = (stageId: string) => {
    const stage = pipeline.stages.find((s) => s.id === stageId);
    if (!stage) return;
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      stage.leads.forEach((l) => next.delete(l.id));
      return next;
    });
  };

  const clearSelection = useCallback(() => setSelectedLeadIds(new Set()), []);

  // ─── Keyboard shortcuts ───────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Escape clears selection
      if (e.key === "Escape" && isSelecting) {
        clearSelection();
      }
      // Cmd/Ctrl + A selects all leads
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && isSelecting) {
        e.preventDefault();
        selectAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelecting, clearSelection, selectAll]);

  const isColumnId = (id: string) => String(id).startsWith("column-");
  const extractStageId = (id: string) => String(id).replace("column-", "");

  // ─── Drag start ─────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);

    if (isColumnId(id)) {
      const stageId = extractStageId(id);
      const stage = pipeline.stages.find((s) => s.id === stageId);
      if (stage) setActiveDrag({ type: "column", stage });
    } else {
      const stage = findStageOfLead(id);
      const lead = stage?.leads.find((l) => l.id === id);
      if (lead) setActiveDrag({ type: "card", lead });
    }
  };

  // ─── Drag over (live reordering) ────────────────────────────────

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Column dragging — no live reordering during drag to avoid jitter
    if (isColumnId(activeId)) return;

    // Card dragging — move card between columns live
    const activeStage = findStageOfLead(activeId);
    const overStage =
      findStageOfLead(overId) ||
      pipeline.stages.find((s) => s.id === overId) ||
      (isColumnId(overId)
        ? pipeline.stages.find((s) => s.id === extractStageId(overId))
        : null);

    if (!activeStage || !overStage || activeStage.id === overStage.id) return;

    const activeLead = activeStage.leads.find((l) => l.id === activeId)!;

    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => {
        if (stage.id === activeStage.id)
          return { ...stage, leads: stage.leads.filter((l) => l.id !== activeId) };
        if (stage.id === overStage.id)
          return { ...stage, leads: [...stage.leads, activeLead] };
        return stage;
      }),
    });
  };

  // ─── Drag end (commit reorder) ──────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // ── Column reorder ──
    if (isColumnId(activeId) && isColumnId(overId)) {
      const activeStageId = extractStageId(activeId);
      const overStageId = extractStageId(overId);

      if (activeStageId === overStageId) return;

      const oldIndex = pipeline.stages.findIndex((s) => s.id === activeStageId);
      const newIndex = pipeline.stages.findIndex((s) => s.id === overStageId);

      if (oldIndex === -1 || newIndex === -1) return;

      const newStages = arrayMove(pipeline.stages, oldIndex, newIndex);

      onPipelineChange({ ...pipeline, stages: newStages });

      // Persist to database
      fetch("/api/stages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: newStages.map((s, i) => ({ id: s.id, position: i })),
        }),
      }).catch(console.error);

      return;
    }

    // ── Card reorder within same column ──
    if (!isColumnId(activeId)) {
      const activeStage = findStageOfLead(activeId);
      const overStage = findStageOfLead(overId);

      if (!activeStage || !overStage || activeStage.id !== overStage.id) {
         // If it's a cross-column move, it was already handled in onDragOver.
         // But we still need to persist the FINAL position of all leads in affected stages.
         const affectedStageIds = new Set<string>();
         if (activeStage) affectedStageIds.add(activeStage.id);
         if (overStage) affectedStageIds.add(overStage.id);

         const leadsToPersist = pipeline.stages
           .filter((s) => affectedStageIds.has(s.id))
           .flatMap((s) => s.leads.map((l, i) => ({ id: l.id, stageId: s.id, position: i })));

         if (leadsToPersist.length > 0) {
           fetch("/api/leads/reorder", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ leads: leadsToPersist }),
           }).catch(console.error);
         }
         return;
      }

      const oldIndex = activeStage.leads.findIndex((l) => l.id === activeId);
      const newIndex = activeStage.leads.findIndex((l) => l.id === overId);

      if (oldIndex === newIndex) return;

      const newLeads = arrayMove(activeStage.leads, oldIndex, newIndex);

      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.map((stage) =>
          stage.id === activeStage.id ? { ...stage, leads: newLeads } : stage
        ),
      });

      // Persist: all leads in this stage need their positions updated
      fetch("/api/leads/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: newLeads.map((l, i) => ({
            id: l.id,
            stageId: activeStage.id,
            position: i,
          })),
        }),
      }).catch(console.error);
    }
  };

  // ─── Stage actions ──────────────────────────────────────────────

  const handleAddStage = async (title: string) => {
    const color = STAGE_COLORS[pipeline.stages.length % STAGE_COLORS.length];
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

      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.map((s) =>
          s.id === tempId ? { ...s, id: data.stage.id } : s
        ),
      });
    } catch {
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

    const prev = pipeline;
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.filter((s) => s.id !== stageId),
    });

    try {
      await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    } catch {
      onPipelineChange(prev);
    }
  };

  const handleRenameStage = async (stageId: string, newTitle: string) => {
    const oldStage = pipeline.stages.find((s) => s.id === stageId);
    if (!oldStage) return;

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
      onPipelineChange({
        ...pipeline,
        stages: pipeline.stages.map((s) =>
          s.id === stageId ? { ...s, title: oldStage.title } : s
        ),
      });
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedLeadIds);

    // Optimistic update
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        leads: stage.leads.filter((l) => !selectedLeadIds.has(l.id)),
      })),
    });
    clearSelection();

    try {
      const res = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
    } catch {
      window.location.reload();
    }
  };

  const handleBulkMove = async (stageId: string) => {
    const ids = Array.from(selectedLeadIds);
    const leadsToMove = allLeads.filter((l) => selectedLeadIds.has(l.id));

    // Optimistic update
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => {
        const withoutMoved = stage.leads.filter((l) => !selectedLeadIds.has(l.id));
        if (stage.id === stageId) {
          return { ...stage, leads: [...withoutMoved, ...leadsToMove] };
        }
        return { ...stage, leads: withoutMoved };
      }),
    });
    clearSelection();

    try {
      const res = await fetch("/api/leads/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, stageId }),
      });
      if (!res.ok) throw new Error("Bulk move failed");
    } catch {
      window.location.reload();
    }
  };

  const handleBulkSetDate = async (date: string) => {
    const ids = Array.from(selectedLeadIds);

    // Optimistic update
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        leads: stage.leads.map((l) =>
          selectedLeadIds.has(l.id) ? { ...l, followUpDate: date } : l
        ),
      })),
    });
    clearSelection();

    try {
      const res = await fetch("/api/leads/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, updates: { followUpDate: date } }),
      });
      if (!res.ok) throw new Error("Bulk date update failed");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLeadFromSummary = (leadId: string) => {
    onPipelineChange({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        leads: stage.leads.filter((l) => l.id !== leadId),
      })),
    });

    // If the deleted lead was selected in bulk mode, remove from selection
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
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
      onPipelineChange(prev);
      alert("Failed to delete lead. Please try again.");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  const columnIds = pipeline.stages.map((s) => `column-${s.id}`);

  return (
    <>
      <div className="flex flex-col">
        {/* Bars — always full width, never scroll */}
        <FollowUpBar
          counts={counts}
          onShowDueLeads={() => setShowingDueOnly(true)}
        />

        {showingDueOnly && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span className="text-blue-700 font-medium flex-1">
              Showing {counts.total} lead{counts.total !== 1 ? "s" : ""} with due or overdue follow-ups
            </span>
            <button
              onClick={() => setShowingDueOnly(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Board — scrolls horizontally only */}
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              <div className={`flex gap-4 ${isSelecting ? "pb-32" : "pb-6"}`}>
                {pipeline.stages.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    isSelecting={isSelecting}
                    selectedLeadIds={selectedLeadIds}
                    showingDueOnly={showingDueOnly}
                    onToggleLead={toggleLead}
                    onSelectAllInStage={selectAllInStage}
                    onDeselectAllInStage={deselectAllInStage}
                    onCardClick={(lead) => handleCardClick(lead, stage.title)}
                    onDelete={handleDeleteStage}
                    onRename={handleRenameStage}
                    onLeadDelete={handleLeadDelete}
                  />
                ))}
                <AddStageButton onAdd={handleAddStage} />
              </div>
            </SortableContext>

            {typeof document !== "undefined" && createPortal(
              <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                {activeDrag?.type === "card" && (
                  <div className="rotate-2 scale-105 shadow-xl opacity-90">
                    <LeadCard lead={activeDrag.lead} onClick={() => {}} />
                  </div>
                )}
                {activeDrag?.type === "column" && (
                  <div className="rotate-1 scale-105 shadow-xl opacity-90 w-64">
                    <div className="bg-white rounded-xl p-4 border border-blue-400 shadow-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: activeDrag.stage.color }}
                        />
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {activeDrag.stage.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 pl-4">
                        {activeDrag.stage.leads.length} lead{activeDrag.stage.leads.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        </div>
      </div>

      {selected && (
        <LeadDetailPanel
          lead={selected.lead}
          stageName={selected.stageName}
          onClose={() => setSelected(null)}
          onSave={handleSaveLead}
          onDelete={handleDeleteLeadFromSummary}
        />
      )}

      {isSelecting && (
        <BulkActionBar
          selectedCount={selectedCount}
          selectedLeads={selectedLeads}
          stages={pipeline.stages}
          totalLeadCount={allLeads.length}
          onMove={handleBulkMove}
          onSetDate={handleBulkSetDate}
          onDelete={handleBulkDelete}
          onSelectAll={selectAll}
          onClear={clearSelection}
        />
      )}
    </>
  );
});

PipelineBoard.displayName = "PipelineBoard";

export default PipelineBoard;