"use client";

import { useState } from "react";
import { Lead, Stage } from "@/app/types/pipeline";

type BulkAction = "move" | "date" | "delete" | null;

type Props = {
  selectedCount: number;
  selectedLeads: Lead[];
  stages: Stage[];
  onMove: (stageId: string) => void;
  onSetDate: (date: string) => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  totalLeadCount: number;
};

export default function BulkActionBar({
  selectedCount,
  selectedLeads,
  stages,
  onMove,
  onSetDate,
  onDelete,
  onSelectAll,
  onClear,
  totalLeadCount,
}: Props) {
  const [activeAction, setActiveAction] = useState<BulkAction>(null);
  const [moveStageId, setMoveStageId] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [loading, setLoading] = useState(false);

  const closeAction = () => {
    setActiveAction(null);
    setMoveStageId("");
    setFollowUpDate("");
  };

  const handleMove = async () => {
    if (!moveStageId) return;
    setLoading(true);
    await onMove(moveStageId);
    setLoading(false);
    closeAction();
  };

  const handleSetDate = async () => {
    if (!followUpDate) return;
    setLoading(true);
    await onSetDate(followUpDate);
    setLoading(false);
    closeAction();
  };

  const handleDelete = async () => {
    setLoading(true);
    await onDelete();
    setLoading(false);
    closeAction();
  };

  // Quick date shortcuts
  const getQuickDate = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      style={{ animation: "slideUpBar 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <style>{`
        @keyframes slideUpBar {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden min-w-[400px]">

        {/* ── Main bar ── */}
        <div className="flex items-center gap-1 px-3 py-2.5">

          {/* Selection count + select all */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-100">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
              {selectedCount} selected
            </span>
            {selectedCount < totalLeadCount && (
              <button
                onClick={onSelectAll}
                className="text-xs text-blue-600 font-medium hover:underline whitespace-nowrap"
              >
                Select all {totalLeadCount}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 px-2">

            {/* Move to stage */}
            <button
              onClick={() => setActiveAction(activeAction === "move" ? null : "move")}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${activeAction === "move"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <svg className="mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              Move to
            </button>

            {/* Set follow-up date */}
            <button
              onClick={() => setActiveAction(activeAction === "date" ? null : "date")}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${activeAction === "date"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <svg className="mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Set date
            </button>

            {/* Delete */}
            <button
              onClick={() => setActiveAction(activeAction === "delete" ? null : "delete")}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${activeAction === "delete"
                  ? "bg-red-500 text-white"
                  : "text-red-500 hover:bg-red-50"
                }
              `}
            >
              <svg className="mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
              Delete
            </button>

          </div>

          {/* Divider + clear */}
          <div className="pl-2 border-l border-gray-100">
            <button
              onClick={onClear}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear selection"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Expandable action panels ── */}

        {/* Move to stage panel */}
        {activeAction === "move" && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-gray-500 whitespace-nowrap">Move to:</span>
            <select
              value={moveStageId}
              onChange={(e) => setMoveStageId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            >
              <option value="">Select a stage...</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <button
              onClick={handleMove}
              disabled={!moveStageId || loading}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading ? "Moving..." : `Move ${selectedCount}`}
            </button>
            <button
              onClick={closeAction}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Set follow-up date panel */}
        {activeAction === "date" && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-sm text-gray-500 whitespace-nowrap">Follow-up:</span>

              {/* Quick date shortcuts */}
              <div className="flex items-center gap-1.5">
                {[
                  { label: "Today",    offset: 0 },
                  { label: "Tomorrow", offset: 1 },
                  { label: "In 3 days", offset: 3 },
                  { label: "Next week", offset: 7 },
                ].map(({ label, offset }) => (
                  <button
                    key={label}
                    onClick={() => setFollowUpDate(getQuickDate(offset))}
                    className={`
                      px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors
                      ${followUpDate === getQuickDate(offset)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom date picker */}
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSetDate}
                disabled={!followUpDate || loading}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : `Set for ${selectedCount} lead${selectedCount !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={closeAction}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete confirmation panel */}
        {activeAction === "delete" && (
          <div className="border-t border-red-50 bg-red-50 px-4 py-3 flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="text-sm text-red-700 font-medium flex-1">
              Delete {selectedCount} lead{selectedCount !== 1 ? "s" : ""}? This cannot be undone.
            </span>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              onClick={closeAction}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
