"use client";

import { useState, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead, Stage } from "@/app/types/pipeline";
import SortableLeadCard from "./SortableLeadCard";

type Props = {
  stage: Stage;
  onCardClick: (lead: Lead) => void;
  onDelete: (stageId: string) => void;
  onRename: (stageId: string, newTitle: string) => void;
  onLeadDelete: (leadId: string) => void;
};

const totalValue = (stage: Stage) =>
  stage.leads.reduce((sum, l) => sum + (l.value || 0), 0);

export default function StageColumn({ stage, onCardClick, onDelete, onRename, onLeadDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(stage.title);

  // ── Column sortable (for horizontal dragging) ──
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `column-${stage.id}` });

  // ── Droppable (so cards can be dropped onto empty columns) ──
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: stage.id });

  // Combined ref for the column
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      setSortableRef(node);
      setDroppableRef(node);
    },
    [setSortableRef, setDroppableRef]
  );

  const columnStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const handleRenameSubmit = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== stage.title) {
      onRename(stage.id, trimmed);
    } else {
      setTitleValue(stage.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent dnd-kit from handling keyboard events
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setTitleValue(stage.title);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stage.leads.length > 0) {
      const confirmed = confirm(
        `"${stage.title}" has ${stage.leads.length} lead(s). Delete the column and all its leads?`
      );
      if (!confirmed) return;
    }
    onDelete(stage.id);
  };

  return (
    <div
      ref={setRefs}
      style={columnStyle}
      className={`flex flex-col w-64 shrink-0 rounded-xl transition-shadow ${
        isDragging ? "ring-2 ring-blue-400 ring-opacity-50 shadow-lg" : ""
      }`}
    >
      {/* Column header — drag handle lives here */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col mb-3 px-1 py-2 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 text-sm font-semibold text-gray-700 bg-white border border-gray-100 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-200 min-w-0"
              />
            ) : (
              <h3
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-gray-700 truncate cursor-pointer hover:text-blue-600 transition-colors"
                title="Click to rename"
              >
                {stage.title}
              </h3>
            )}
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleDelete}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
            title="Delete column"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <span className="text-xs text-gray-400">{stage.leads.length} {stage.leads.length === 1 || stage.leads.length === 0 ? "lead" : "leads"}</span>
          {totalValue(stage) > 0 && (
            <span className="text-xs text-gray-400">
              ${totalValue(stage).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Cards container — NOT part of the drag handle */}
      <div
        className={`flex flex-col gap-2 min-h-32 rounded-xl p-2 transition-colors ${
          isOver ? "bg-blue-50 ring-2 ring-blue-200" : "bg-gray-100 ring-1 ring-gray-200/70"
        }`}
      >
        <SortableContext
          items={stage.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {stage.leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                <span className="text-gray-300 text-md font-bold">+</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">No leads yet.<br/>Drop a lead here or </p>
              <a
                onPointerDown={(e) => e.stopPropagation()}
                href="/leads/new"
                className="text-xs text-blue-500 font-medium hover:underline"
              >
                add one manually.
              </a>
            </div>
          ) : (
            stage.leads.map((lead) => (
              <SortableLeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead)}
                onDelete={() => onLeadDelete(lead.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}