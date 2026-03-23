"use client";

import { useState, useEffect } from "react";
import { Lead } from "@/app/types/pipeline";
import { getFollowUpStatus } from "@/lib/follow-up-status";

type Props = {
  lead: Lead;
  stageName: string;
  onClose: () => void;
  onSave: (updated: Lead) => void;
  onDelete: (leadId: string) => void;
};

export default function LeadDetailPanel({ lead, stageName, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Lead>(lead);
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const followUp = getFollowUpStatus(form.followUpDate);

  useEffect(() => {
    setConfirmingDelete(false);
    setDeleting(false);
    setDeleteError(null);
    setForm(lead);
  }, [lead.id]);

  const update = (field: keyof Lead, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          value: form.value,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          followUpDate: form.followUpDate,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      onSave(form);
      onClose();
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete lead.");
      }

      onDelete(lead.id);
      onClose();
    } catch (err: any) {
      setDeleting(false);
      setConfirmingDelete(false);
      setDeleteError(err.message ?? "Something went wrong. Please try again.");
    }
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
          <div className="flex items-center gap-4">
            {form.avatarUrl ? (
              <img
                src={form.avatarUrl}
                alt={form.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-100">
                {form.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium flex items-center gap-2">
                {stageName}
              </p>
              <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{form.name}</h2>
                {form.profileUrl && (
                  <div className="flex items-center gap-3">
                    <a
                      href={form.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 normal-case tracking-normal"
                      title="View Profile"
                    >
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                    <a
                      href={(() => {
                        try {
                          const url = new URL(form.profileUrl);
                          const id = url.searchParams.get("id");
                          if (id) return `https://m.me/${id}`;

                          const segments = url.pathname.split("/").filter(Boolean);
                          // Handle people/name/id
                          if (segments[0] === "people" && segments[2]) return `https://m.me/${segments[2]}`;
                          // Handle vanity URL
                          if (segments[0]) return `https://m.me/${segments[0]}`;

                          return `https://m.me/`;
                        } catch {
                          return `https://m.me/`;
                        }
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00B2FF] hover:text-[#0099FF] transition-colors flex items-center gap-1 normal-case tracking-normal"
                      title="Message"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.503 3.735 7.152.195.14.316.362.316.598v2.324c0 .35.39.554.672.348l2.67-1.956a.668.668 0 0 1 .494-.105c.677.16 1.393.247 2.13.247 5.523 0 10-4.145 10-9.258S17.523 2 12 2zm1.096 12.551-2.454-2.618-4.786 2.618 5.263-5.592 2.454 2.618 4.786-2.618-5.263 5.592z" />
                      </svg>
                    </a>
                  </div>
                )}
            </div>
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
            {followUp.state !== "none" && (
              <p className="text-xs font-semibold mt-1" style={{ color: followUp.color }}>
                {followUp.label}
              </p>
            )}
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
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 mt-auto">
          {!confirmingDelete ? (
            <div className="flex items-center justify-between">
              {/* Delete button - left */}
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                Delete
              </button>

              {/* Save + Cancel - right */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setConfirmingDelete(false);
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="text-sm text-gray-600 truncate">
                  Delete this lead? This cannot be undone.
                </span>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          {deleteError && (
            <p className="text-xs text-red-500 mt-2">{deleteError}</p>
          )}
        </div>

      </div>
    </>
  );
}