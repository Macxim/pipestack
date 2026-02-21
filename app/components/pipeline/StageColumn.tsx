"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Lead, Stage } from "@/app/types/pipeline";
import SortableLeadCard from "./SortableLeadCard";

type Props = {
  stage: Stage;
  onCardClick: (lead: Lead) => void;
  onDelete: (stageId: string) => void;
  onRename: (stageId: string, newTitle: string) => void;
};

const totalValue = (stage: Stage) =>
  stage.leads.reduce((sum, l) => sum + l.value, 0);

export default function StageColumn({ stage, onCardClick, onDelete, onRename }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(stage.title);

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
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setTitleValue(stage.title);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (stage.leads.length > 0) {
      const confirmed = confirm(
        `"${stage.title}" has ${stage.leads.length} lead(s). Delete the column and all its leads?`
      );
      if (!confirmed) return;
    }
    onDelete(stage.id);
  };

  return (
    <div className="flex flex-col w-64 shrink-0 mt-2">
      {/* Column header */}
      <div className="mb-3">
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
                className="flex-1 text-sm font-semibold text-gray-700 bg-white border border-gray-100 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-200 min-w-0"
              />
            ) : (
              <h3
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-gray-700 truncate cursor-pointer hover:text-blue-600 transition-colors"
                title="Click to rename"
              >
                {stage.title}
              </h3>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
            title="Delete column"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <span className="text-xs text-gray-400">{stage.leads.length} leads</span>
          {totalValue(stage) > 0 && (
            <span className="text-xs text-gray-400">
              ${totalValue(stage).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-32 rounded-xl p-2 transition-colors ${
          isOver ? "bg-blue-50 ring-2 ring-blue-200" : "bg-gray-100"
        }`}
      >
        <SortableContext
          items={stage.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {stage.leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}