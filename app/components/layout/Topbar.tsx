"use client";

import { useState, useEffect } from "react";

type Props = {
  initialTitle: string;
  pipelineId: string;
  isEditable?: boolean;
  onSearchOpen: () => void;
};

export default function Topbar({ initialTitle, pipelineId, isEditable = true, onSearchOpen }: Props) {

  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const handleSave = async () => {
    if (title === initialTitle) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pipelineId, title }),
      });

      if (!res.ok) throw new Error("Failed to update title");
    } catch (err) {
      console.error("Error updating title:", err);
      setTitle(initialTitle); // Rollback
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  };



  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center">
        {isEditing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-auto min-w-[100px]"
            style={{ width: `${Math.max(title.length + 2, 8)}ch` }}
          />
        ) : (
          <span
            onClick={() => isEditable && setIsEditing(true)}
            className={`text-sm font-medium transition-colors ${
              isEditable
                ? "text-gray-500 hover:text-gray-900 cursor-pointer"
                : "text-gray-900 cursor-default"
            }`}
          >
            {title}
          </span>
        )}
        {isSaving && <span className="ml-3 text-[10px] text-gray-400 animate-pulse">Saving...</span>}
      </div>

      {/* Right: search trigger + logout */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
          title="Search leads (⌘K)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="text-xs font-medium">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded shadow-sm">
            ⌘ K
          </kbd>
        </button>
      </div>
    </header>
  );
}