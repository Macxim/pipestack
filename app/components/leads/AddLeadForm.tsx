"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Stage = { id: string; title: string; color: string; position: number };
type Props = { stages: Stage[] };

const PLATFORMS = [
  { value: "", label: "Select platform..." },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" },
];

export default function AddLeadForm({ stages }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    stageId: stages[0]?.id ?? "",
    email: "",
    phone: "",
    profileUrl: "",
    platform: "",
    followUpDate: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters.";
    if (!form.stageId)
      errs.stageId = "Please select a stage.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email address.";
    if (form.profileUrl && !form.profileUrl.startsWith("http"))
      errs.profileUrl = "URL must start with http:// or https://";
    return errs;
  };

  const handleSubmit = async (addAnother = false) => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          stageId: form.stageId,
          email: form.email || null,
          phone: form.phone || null,
          profileUrl: form.profileUrl || null,
          platform: form.platform || null,
          followUpDate: form.followUpDate || null,
          notes: form.notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error ?? "Something went wrong." });
        setLoading(false);
        return;
      }

      if (addAnother) {
        // Reset form but keep stage selection
        setForm((prev) => ({
          name: "",
          stageId: prev.stageId,
          email: "",
          phone: "",
          profileUrl: "",
          platform: "",
          followUpDate: "",
          notes: "",
        }));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
      errors[field] ? "border-red-400" : "border-gray-200"
    }`;

  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add a Lead</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manually add someone to your pipeline.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium flex items-center gap-2">
          <span>✓</span> Lead added successfully. Ready for the next one.
        </div>
      )}

      {/* Form card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">

        {/* Row 1: Name + Stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. John Smith"
              className={inputClass("name")}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={labelClass}>Pipeline Stage <span className="text-red-400">*</span></label>
            <select
              value={form.stageId}
              onChange={(e) => set("stageId", e.target.value)}
              className={inputClass("stageId")}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            {errors.stageId && <p className="text-xs text-red-500 mt-1">{errors.stageId}</p>}
          </div>
        </div>

        {/* Row 2: Email + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="john@example.com"
              className={inputClass("email")}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputClass("phone")}
            />
          </div>
        </div>

        {/* Row 3: Profile URL + Platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Profile URL</label>
            <input
              type="url"
              value={form.profileUrl}
              onChange={(e) => set("profileUrl", e.target.value)}
              placeholder="https://facebook.com/..."
              className={inputClass("profileUrl")}
            />
            {errors.profileUrl && <p className="text-xs text-red-500 mt-1">{errors.profileUrl}</p>}
          </div>

          <div>
            <label className={labelClass}>Platform</label>
            <select
              value={form.platform}
              onChange={(e) => set("platform", e.target.value)}
              className={inputClass("platform")}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Follow-up date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Follow-up Date</label>
            <input
              type="date"
              value={form.followUpDate}
              onChange={(e) => set("followUpDate", e.target.value)}
              className={inputClass("followUpDate")}
            />
          </div>
        </div>

        {/* Notes — full width */}
        <div className="mb-8">
          <label className={labelClass}>
            Notes
            <span className="ml-auto float-right normal-case tracking-normal font-normal text-gray-400">
              {form.notes.length}/500
            </span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value.slice(0, 500))}
            placeholder="Add any context about this lead..."
            rows={4}
            className={`${inputClass("notes")} resize-none`}
          />
        </div>

        {/* Submit error */}
        {errors.submit && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => router.push("/")}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Save & add another"}
            </button>

            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Add Lead →"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
