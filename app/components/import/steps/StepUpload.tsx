"use client";

import { useState, useRef, useCallback } from "react";
import { ParsedRow } from "../types";

type Props = {
  onParsed: (headers: string[], rows: ParsedRow[]) => void;
};

export default function StepUpload({ onParsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) throw new Error("File must have a header row and at least one data row.");

    // Simple CSV parser — handles quoted fields with commas inside
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0])
      .map((h) => h.replace(/^"|"$/g, "").trim())
      .filter(Boolean);

    const rows = lines.slice(1).map((line) => {
      const values = parseRow(line);
      const row: ParsedRow = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? "").replace(/^"|"$/g, "").trim();
      });
      return row;
    });

    return { headers, rows };
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.name.endsWith(".csv")) {
        setError("Only .csv files are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large. Maximum size is 10MB.");
        return;
      }

      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const { headers, rows } = parseCSV(text);
          onParsed(headers, rows);
        } catch (err: any) {
          setError(err.message ?? "Could not parse file.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    },
    [onParsed]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Template download card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-blue-600 text-lg">📄</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">Not sure how to format your file?</p>
          <p className="text-xs text-blue-700 mb-2">
            Download our template — it has the right column names pre-filled so you can paste your data straight
            in.
          </p>
          <a
            href="/api/import/template"
            download="pipestack-import-template.csv"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            ↓ Download CSV template
          </a>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12
          flex flex-col items-center justify-center text-center
          cursor-pointer transition-colors
          ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">📂</span>
        </div>
        <p className="text-base font-semibold text-gray-900 mb-1">
          {loading ? "Parsing file..." : "Drop your CSV file here"}
        </p>
        <p className="text-sm text-gray-500">
          {loading ? "Please wait..." : "or click to browse · CSV only · max 10MB"}
        </p>
      </div>

      {/* Supported CRMs */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Works with exports from</p>
        <div className="flex flex-wrap gap-2">
          {["HubSpot", "Pipedrive", "Salesforce", "Zoho", "Notion", "Excel", "Google Sheets", "Any CSV"].map((crm) => (
            <span
              key={crm}
              className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600"
            >
              {crm}
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {/* Field reference */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Supported fields</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Field</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Required</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Example</th>
            </tr>
          </thead>
          <tbody>
            {[
              { field: "name", required: true, example: "John Smith" },
              { field: "email", required: false, example: "john@example.com" },
              { field: "phone", required: false, example: "+1 555 000 0000" },
              { field: "profile_url", required: false, example: "https://facebook.com/..." },
              { field: "notes", required: false, example: "Met at conference" },
              { field: "follow_up_date", required: false, example: "2026-04-15" },
            ].map((row) => (
              <tr key={row.field} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{row.field}</td>
                <td className="px-4 py-2.5">
                  {row.required ? (
                    <span className="text-xs font-semibold text-red-500">Required</span>
                  ) : (
                    <span className="text-xs text-gray-400">Optional</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
