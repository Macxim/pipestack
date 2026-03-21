"use client";

import { useEffect } from "react";
import { ParsedRow, MappingConfig } from "../types";

type Props = {
  headers: string[];
  rows: ParsedRow[];
  mapping: MappingConfig;
  onChange: (m: MappingConfig) => void;
  onBack: () => void;
  onNext: () => void;
};

const FIELDS: { key: keyof MappingConfig; label: string; required: boolean; hint: string }[] = [
  { key: "name", label: "Full Name", required: true, hint: "Person's full name" },
  { key: "email", label: "Email", required: false, hint: "Email address" },
  { key: "phone", label: "Phone", required: false, hint: "Phone number" },
  { key: "profileUrl", label: "Profile URL", required: false, hint: "Facebook, LinkedIn, etc." },
  { key: "notes", label: "Notes", required: false, hint: "Any notes or context" },
  { key: "followUpDate", label: "Follow-up Date", required: false, hint: "Date format: YYYY-MM-DD" },
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[\s_\-\.]/g, "");
}

function autoMatch(headers: string[]): MappingConfig {
  const find = (candidates: string[]): string | null => {
    for (const c of candidates) {
      const match = headers.find((h) => normalize(h).includes(normalize(c)));
      if (match) return match;
    }
    return null;
  };
  return {
    name: find(["name", "fullname", "contactname"]),
    email: find(["email", "emailaddress", "mail"]),
    phone: find(["phone", "mobile", "tel", "cell"]),
    profileUrl: find(["profileurl", "profile", "facebookurl", "facebook", "linkedin", "url"]),
    notes: find(["notes", "note", "comments", "description"]),
    followUpDate: find(["followup", "followupdate", "duedate", "date"]),
  };
}

export default function StepMapping({ headers, rows, mapping, onChange, onBack, onNext }: Props) {
  // Auto-match on first render if mapping is empty
  useEffect(() => {
    const isInitial = Object.values(mapping).every((v) => v === null);
    if (isInitial) {
      onChange(autoMatch(headers));
    }
  }, []);

  const canProceed = !!mapping.name;

  // Get sample values from the first 3 rows for a given column
  const getSamples = (col: string | null): string[] => {
    if (!col) return [];
    return rows
      .slice(0, 3)
      .map((r) => r[col] ?? "")
      .filter(Boolean);
  };

  const update = (key: keyof MappingConfig, value: string) => {
    onChange({ ...mapping, [key]: value === "" ? null : value });
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Match your columns.</span> We've auto-matched what we could. Review each field
        and correct any mismatches.
      </div>

      {/* File stats */}
      <div className="flex gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center flex-1">
          <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">rows detected</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center flex-1">
          <p className="text-2xl font-bold text-gray-900">{headers.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">columns detected</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center flex-1">
          <p className="text-2xl font-bold text-green-600">{Object.values(mapping).filter(Boolean).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">fields mapped</p>
        </div>
      </div>

      {/* Mapping table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pipestack Field</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your CSV Column</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sample Values</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {FIELDS.map((field) => {
            const samples = getSamples(mapping[field.key]);
            const isMatched = !!mapping[field.key];

            return (
              <div key={field.key} className="px-5 py-4 grid grid-cols-3 gap-4 items-center">
                {/* Pipestack field */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{field.label}</span>
                    {field.required && <span className="text-xs font-bold text-red-400">*</span>}
                    {isMatched && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>
                </div>

                {/* Column selector */}
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Ignore this field —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                {/* Sample values */}
                <div className="flex flex-col gap-1">
                  {samples.length > 0 ? (
                    samples.map((s, i) => (
                      <span key={i} className="text-xs text-gray-500 truncate bg-gray-50 px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-300 italic">No values</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation error */}
      {!canProceed && <p className="text-sm text-red-500 font-medium">⚠ You must map the "Full Name" field before continuing.</p>}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Preview import →
        </button>
      </div>
    </div>
  );
}
