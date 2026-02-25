"use client";

import { useState, useEffect } from "react";

type Props = {
  initialTitle: string;
  pipelineId: string;
};

export default function Topbar({ initialTitle, pipelineId }: Props) {

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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
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
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
        >
          {title}
        </span>
      )}
      {isSaving && <span className="ml-3 text-[10px] text-gray-400 animate-pulse">Saving...</span>}
    </header>
  );
}