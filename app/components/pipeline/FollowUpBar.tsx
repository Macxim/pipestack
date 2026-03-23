"use client";

import { useState, useEffect } from "react";
import { FollowUpCounts } from "@/lib/follow-up-counts";

type Props = {
  counts: FollowUpCounts;
  onShowDueLeads: () => void;
};

const DISMISSED_KEY = "pipestack_notification_bar_dismissed";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getSummaryMessage(counts: FollowUpCounts): string {
  const parts: string[] = [];
  if (counts.overdue > 0)
    parts.push(`${counts.overdue} overdue lead${counts.overdue !== 1 ? "s" : ""}`);
  if (counts.today > 0)
    parts.push(`${counts.today} follow-up${counts.today !== 1 ? "s" : ""} due today`);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} and ${parts[1]}`;
}

export default function FollowUpBar({ counts, onShowDueLeads }: Props) {
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    try {
      const dismissedDate = localStorage.getItem(DISMISSED_KEY);
      setDismissed(dismissedDate === getTodayString());
    } catch {
      // localStorage unavailable — show bar
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, getTodayString());
    } catch {}
    setDismissed(true);
  };

  // Don't render if: nothing due, or dismissed today
  if (counts.total === 0 || dismissed) return null;

  const isOverdue = counts.overdue > 0;
  const message = getSummaryMessage(counts);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm mb-4
        ${isOverdue ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}
      `}
    >
      {/* Icon */}
      <span className={isOverdue ? "text-red-500" : "text-amber-500"}>
        {isOverdue ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )}
      </span>

      {/* Message */}
      <span className={`font-medium flex-1 ${isOverdue ? "text-red-800" : "text-amber-800"}`}>
        {message}
      </span>

      {/* Show on board */}
      <button
        onClick={onShowDueLeads}
        className={`
          text-xs font-semibold px-3 py-1 rounded-lg border transition-colors whitespace-nowrap
          ${isOverdue
            ? "border-red-300 text-red-700 hover:bg-red-100"
            : "border-amber-300 text-amber-700 hover:bg-amber-100"
          }
        `}
      >
        Show on board
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        title="Dismiss for today"
        className={`
          p-1 rounded transition-colors
          ${isOverdue
            ? "text-red-400 hover:text-red-600 hover:bg-red-100"
            : "text-amber-400 hover:text-amber-600 hover:bg-amber-100"
          }
        `}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
