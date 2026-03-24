"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Pipeline, Lead } from "@/app/types/pipeline";
import { getFollowUpStatus } from "@/lib/follow-up-status";

type SearchResult = {
  lead: Lead;
  stageName: string;
  stageColor: string;
  matchedField: "name" | "email" | "phone" | "notes";
};

type Props = {
  pipeline: Pipeline;
  open: boolean;
  onClose: () => void;
  onSelectLead: (lead: Lead, stageName: string) => void;
};

// Normalize string for comparison — lowercase, trim whitespace
function normalize(str: string): string {
  return str.toLowerCase().trim();
}

// Check if a string contains the query
function matches(value: string | null | undefined, query: string): boolean {
  if (!value) return false;
  return normalize(value).includes(query);
}

// Highlight matching text — wraps matched portion in a span
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = normalize(text).indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchPalette({ pipeline, open, onClose, onSelectLead }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Compute search results from pipeline data in memory
  const results = useMemo((): SearchResult[] => {
    const q = normalize(query);
    if (!q) return [];

    const found: SearchResult[] = [];

    pipeline.stages.forEach((stage) => {
      stage.leads.forEach((lead) => {
        // Determine which field matched — for showing context in result
        let matchedField: SearchResult["matchedField"] | null = null;

        if (matches(lead.name, q)) matchedField = "name";
        else if (matches(lead.email, q)) matchedField = "email";
        else if (matches(lead.phone, q)) matchedField = "phone";
        else if (matches(lead.notes, q)) matchedField = "notes";

        if (matchedField) {
          found.push({
            lead,
            stageName: stage.title,
            stageColor: stage.color,
            matchedField,
          });
        }
      });
    });

    // Sort: name matches first, then email, then phone, then notes
    const fieldOrder = { name: 0, email: 1, phone: 2, notes: 3 };
    found.sort((a, b) => fieldOrder[a.matchedField] - fieldOrder[b.matchedField]);

    return found.slice(0, 8); // cap at 8 results to keep the palette compact
  }, [query, pipeline]);

  // Close on Escape, navigate on arrow keys
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const result = results[activeIndex];
        if (result) {
          handleSelect(result);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex, results, onClose]); // Added missing dependencies

  // Reset activeIndex when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = (result: SearchResult) => {
    onSelectLead(result.lead, result.stageName);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed left-1/2 top-[20%] -translate-x-1/2 z-50
          w-full max-w-lg bg-white rounded-2xl border border-gray-200
          shadow-2xl overflow-hidden"
        style={{ animation: "paletteIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <style>{`
          @keyframes paletteIn {
            from { transform: translateX(-50%) scale(0.96); opacity: 0; }
            to   { transform: translateX(-50%) scale(1);    opacity: 1; }
          }
          mark { font-style: normal; }
        `}</style>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads by name, email, phone, or notes..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400
              bg-transparent outline-none"
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors
                shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}

          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px]
            font-medium text-gray-400 bg-gray-100 border border-gray-200
            rounded shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-96">

          {/* No query yet — show hint */}
          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">
                Start typing to search across all your leads
              </p>
            </div>
          )}

          {/* Query entered but no results */}
          {query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">
                No leads found for "{query}"
              </p>
              <p className="text-xs text-gray-400">
                Try searching by name, email, phone, or notes
              </p>
            </div>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, i) => {
                const { lead, stageName, stageColor, matchedField } = result;
                const followUp = getFollowUpStatus(lead.followUpDate);
                const isActive = i === activeIndex;

                return (
                  <div
                    key={lead.id}
                    data-index={i}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`
                      flex items-center gap-3 px-4 py-3 cursor-pointer
                      transition-colors duration-75
                      ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}
                    `}
                  >
                    {/* Avatar */}
                    {lead.avatarUrl ? (
                      <img
                        src={lead.avatarUrl}
                        alt={lead.name}
                        className="w-9 h-9 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0
                        flex items-center justify-center text-sm font-semibold
                        text-gray-500">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Lead info */}
                    <div className="flex-1 min-w-0">

                      {/* Name — always shown, highlighted if matched */}
                      <div className="text-sm font-semibold text-gray-900
                        truncate">
                        {highlight(lead.name, normalize(query))}
                      </div>

                      {/* Matched secondary field — email, phone, or notes snippet */}
                      {matchedField !== "name" && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {matchedField === "email" && highlight(lead.email ?? "", normalize(query))}
                          {matchedField === "phone" && highlight(lead.phone ?? "", normalize(query))}
                          {matchedField === "notes" && (
                            // Show a snippet around the match, not the full notes
                            (() => {
                              const notes = lead.notes ?? "";
                              const idx = normalize(notes).indexOf(normalize(query));
                              const start = Math.max(0, idx - 20);
                              const end = Math.min(notes.length, idx + query.length + 20);
                              const snippet = (start > 0 ? "..." : "") +
                                notes.slice(start, end) +
                                (end < notes.length ? "..." : "");
                              return highlight(snippet, normalize(query));
                            })()
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side metadata */}
                    <div className="flex flex-col items-end gap-1 shrink-0">

                      {/* Stage pill */}
                      <span className="inline-flex items-center gap-1 text-[10px]
                        font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${stageColor}18`,
                          color: stageColor,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: stageColor }}
                        />
                        {stageName}
                      </span>

                      {/* Follow-up badge — only if overdue or today */}
                      {(followUp.state === "overdue" || followUp.state === "today") && (
                        <span className="text-[10px] font-semibold"
                          style={{ color: followUp.color }}>
                          {followUp.label}
                        </span>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer — keyboard hints */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-t
            border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400
                bg-white border border-gray-200 rounded">↑↓</kbd>
              <span className="text-[10px] text-gray-400">navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400
                bg-white border border-gray-200 rounded">↵</kbd>
              <span className="text-[10px] text-gray-400">open lead</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400
                bg-white border border-gray-200 rounded">Esc</kbd>
              <span className="text-[10px] text-gray-400">close</span>
            </div>
          </div>
        )}

      </div>
    </>,
    document.body
  );
}
