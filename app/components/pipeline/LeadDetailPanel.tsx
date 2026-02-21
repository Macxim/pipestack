"use client";

import { useState } from "react";
import { Lead, LeadStatus } from "@/app/types/pipeline";

type Props = {
  lead: Lead;
  stageName: string;
  onClose: () => void;
  onSave: (updated: Lead) => void;
};

const statusOptions: { value: LeadStatus; label: string; color: string }[] = [
  { value: "none", label: "No status", color: "bg-gray-200 text-gray-600" },
  { value: "upcoming", label: "Upcoming", color: "bg-yellow-400 text-white" },
  { value: "today", label: "Today", color: "bg-green-400 text-white" },
  { value: "overdue", label: "Overdue", color: "bg-red-500 text-white" },
];

export default function LeadDetailPanel({ lead, stageName, onClose, onSave }: Props) {
  const [form, setForm] = useState<Lead>(lead);

  const update = (field: keyof Lead, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{stageName}</p>
            <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{form.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update("status", opt.value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all border-2 ${
                    form.status === opt.value
                      ? `${opt.color} border-transparent`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deal Value */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Deal Value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={form.value}
                onChange={(e) => update("value", Number(e.target.value))}
                className="w-full pl-7 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Follow-up Date
            </label>
            <input
              type="date"
              value={form.followUpDate ?? ""}
              onChange={(e) => update("followUpDate", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add notes about this lead..."
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save changes
          </button>
        </div>

      </div>
    </>
  );
}