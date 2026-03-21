"use client";

import { useState, useEffect } from "react";
import { ParsedRow, MappingConfig, ImportResult } from "../types";

type Props = {
  rows: ParsedRow[];
  mapping: MappingConfig;
  onBack: () => void;
  onImport: (result: ImportResult) => void;
};

type LeadRow = {
  name: string;
  email: string;
  phone: string;
  profileUrl: string;
  notes: string;
  followUpDate: string;
  // Status after validation
  status: "valid" | "duplicate" | "invalid";
  error?: string;
  include: boolean; // whether to include in import (user can toggle duplicates)
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidDate(d: string) {
  if (!d) return true;
  const parsed = new Date(d);
  return !isNaN(parsed.getTime());
}

function applyMapping(row: ParsedRow, mapping: MappingConfig): Omit<LeadRow, "status" | "error" | "include"> {
  const get = (key: keyof MappingConfig) => (mapping[key] ? (row[mapping[key]!] ?? "").trim() : "");
  return {
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    profileUrl: get("profileUrl"),
    notes: get("notes"),
    followUpDate: get("followUpDate"),
  };
}

export default function StepPreview({ rows, mapping, onBack, onImport }: Props) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function prepare() {
      // 1. Apply mapping and validate
      const mapped = rows.map((row) => {
        const lead = applyMapping(row, mapping);
        let status: LeadRow["status"] = "valid";
        let error: string | undefined;

        if (!lead.name) {
          status = "invalid";
          error = "Name is empty";
        } else if (lead.email && !isValidEmail(lead.email)) {
          status = "invalid";
          error = `Invalid email: ${lead.email}`;
        } else if (lead.followUpDate && !isValidDate(lead.followUpDate)) {
          status = "invalid";
          error = `Invalid date: ${lead.followUpDate}`;
        }

        return { ...lead, status, error, include: status === "valid" } as LeadRow;
      });

      // 2. Check duplicates via API for valid rows
      const validLeads = mapped.filter((l) => l.status === "valid");
      if (validLeads.length > 0) {
        try {
          const res = await fetch("/api/leads/check-duplicates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leads: validLeads.map((l) => ({
                name: l.name,
                email: l.email || undefined,
                profileUrl: l.profileUrl || undefined,
              })),
            }),
          });
          const data = await res.json();
          const dupeSet = new Set<string>(data.duplicates ?? []);

          mapped.forEach((lead) => {
            if (lead.status !== "valid") return;
            const isDupe =
              (lead.profileUrl && dupeSet.has(lead.profileUrl)) || (lead.email && dupeSet.has(lead.email));
            if (isDupe) {
              lead.status = "duplicate";
              lead.include = false; // unchecked by default
            }
          });
        } catch {
          // If check fails, proceed without duplicate detection
        }
      }

      setLeads(mapped);
      setLoading(false);
    }

    prepare();
  }, []);

  const toggleInclude = (i: number) => {
    setLeads((prev) =>
      prev.map((l, idx) => (idx === i && l.status !== "invalid" ? { ...l, include: !l.include } : l))
    );
  };

  const toggleAll = (include: boolean) => {
    setLeads((prev) => prev.map((l) => (l.status !== "invalid" ? { ...l, include } : l)));
  };

  const validCount = leads.filter((l) => l.status === "valid").length;
  const dupeCount = leads.filter((l) => l.status === "duplicate").length;
  const invalidCount = leads.filter((l) => l.status === "invalid").length;
  const selectedCount = leads.filter((l) => l.include).length;

  const handleImport = async () => {
    setImporting(true);
    const selected = leads.filter((l) => l.include);

    try {
      const res = await fetch("/api/leads/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: selected.map((l) => ({
            name: l.name,
            email: l.email || null,
            phone: l.phone || null,
            profileUrl: l.profileUrl || null,
            notes: l.notes || null,
            followUpDate: l.followUpDate || null,
            platform: null,
            avatarUrl: null,
          })),
        }),
      });

      const data = await res.json();
      onImport({
        imported: data.count ?? 0,
        skipped: data.skipped ?? 0,
        failed: invalidCount,
        errors: leads
          .filter((l) => l.status === "invalid")
          .map((l) => `"${l.name || "empty row"}": ${l.error}`),
      });
    } catch {
      onImport({ imported: 0, skipped: 0, failed: selected.length, errors: ["Network error."] });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Checking for duplicates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{validCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">ready to import</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{dupeCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">duplicates</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-500">{invalidCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">invalid rows</p>
        </div>
      </div>

      {/* Table controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={leads.filter((l) => l.status !== "invalid").every((l) => l.include)}
            onChange={(e) => toggleAll(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-gray-600 font-medium">
            {selectedCount} of {leads.length} selected
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Deselect all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() =>
              setLeads((prev) => prev.map((l) => (l.status === "duplicate" ? { ...l, include: true } : l)))
            }
            className="text-xs text-amber-600 hover:text-amber-800 underline"
          >
            Include all duplicates
          </button>
        </div>
      </div>

      {/* Preview table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead, i) => (
                <tr
                  key={i}
                  className={`
                    transition-colors
                    ${lead.status === "invalid" ? "bg-red-50 opacity-60" : ""}
                    ${lead.status === "duplicate" && !lead.include ? "opacity-50" : ""}
                    ${lead.include ? "hover:bg-gray-50" : ""}
                  `}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={lead.include}
                      disabled={lead.status === "invalid"}
                      onChange={() => toggleInclude(i)}
                      className="w-4 h-4 accent-blue-600 disabled:opacity-30"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {lead.name || <span className="text-gray-300 italic">empty</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{lead.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {lead.status === "valid" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        ✓ Ready
                      </span>
                    )}
                    {lead.status === "duplicate" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        Already imported
                      </span>
                    )}
                    {lead.status === "invalid" && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full cursor-help"
                        title={lead.error}
                      >
                        ✕ Invalid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleImport}
          disabled={selectedCount === 0 || importing}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? "Importing..." : `Import ${selectedCount} lead${selectedCount !== 1 ? "s" : ""} →`}
        </button>
      </div>
    </div>
  );
}
