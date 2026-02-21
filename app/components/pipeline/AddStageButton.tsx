"use client";

import { useState } from "react";

type Props = {
  onAdd: (title: string) => void;
};

export default function AddStageButton({ onAdd }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") {
      setTitle("");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col w-64 shrink-0">
        <div className="bg-gray-100 rounded-xl p-3 flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stage name..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setTitle(""); setIsEditing(false); }}
              className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 w-64 shrink-0 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm font-medium"
    >
      <span className="text-lg leading-none">+</span>
      Add column
    </button>
  );
}