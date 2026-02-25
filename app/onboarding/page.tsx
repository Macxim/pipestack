"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DEFAULT_STAGES = [
  { title: "Lead In", color: "#3b82f6" },
  { title: "Friend Request Sent", color: "#8b5cf6" },
  { title: "Invite To Group Sent", color: "#f59e0b" },
  { title: "48Hr Follow Up", color: "#ec4899" },
  { title: "Demo Booked", color: "#10b981" },
  { title: "Closed / Won", color: "#06b6d4" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pipelineName, setPipelineName] = useState("");
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const updateStageTitle = (i: number, title: string) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, title } : s)));

  const removeStage = (i: number) =>
    setStages((prev) => prev.filter((_, idx) => idx !== i));

  const addStage = () =>
    setStages((prev) => [...prev, { title: "New Stage", color: "#6b7280" }]);

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Create pipeline + stages, then move to step 3
  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: pipeline, error: pipelineError } = await supabase
      .from("pipelines")
      .insert({ title: pipelineName || "My Pipeline", user_id: user.id })
      .select()
      .single();

    if (pipelineError || !pipeline) {
      setError("Failed to create pipeline. Please try again.");
      setLoading(false);
      return;
    }

    const stageRows = stages.map((s, i) => ({
      pipeline_id: pipeline.id,
      user_id: user.id,
      title: s.title,
      color: s.color,
      position: i,
    }));

    const { error: stagesError } = await supabase.from("stages").insert(stageRows);
    if (stagesError) {
      setError("Failed to create stages. Please try again.");
      setLoading(false);
      return;
    }

    // Generate API key and move to step 3
    const res = await fetch("/api/auth/api-key");
    const data = await res.json();
    setApiKey(data.key);
    setLoading(false);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-lg">

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "bg-blue-600" : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Pipeline name ── */}
        {step === 1 && (
          <div>
            <div className="text-3xl mb-3">🚀</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Name your pipeline
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              This is the name of your sales pipeline. You can change it later.
            </p>
            <input
              autoFocus
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              placeholder="e.g. FB Outreach Q1"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              onKeyDown={(e) => { if (e.key === "Enter") setStep(2); }}
            />
            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Stages ── */}
        {step === 2 && (
          <div>
            <div className="text-3xl mb-3">🗂️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Set up your stages
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Edit, remove, or add stages to match your workflow.
            </p>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {stages.map((stage, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <input
                    type="text"
                    value={stage.title}
                    onChange={(e) => updateStageTitle(i, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeStage(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg w-6 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addStage}
              className="text-sm text-blue-600 font-medium hover:underline mb-6 block"
            >
              + Add a stage
            </button>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Setting up..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Extension setup ── */}
        {step === 3 && (
          <div>
            <div className="text-3xl mb-3">🧩</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Connect the Chrome extension
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              The extension lets you import leads directly from Facebook. It takes 2 minutes to set up.
            </p>

            {/* Steps */}
            <div className="space-y-4 mb-6">

              {/* Step 3a */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Install the extension
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Open Chrome and go to{" "}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">chrome://extensions</code>,
                    enable Developer Mode, click{" "}
                    <span className="font-medium">"Load unpacked"</span> and select
                    the extension folder.
                  </p>
                </div>
              </div>

              {/* Step 3b */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Copy your API key
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    This key connects the extension to your account. Keep it private.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 truncate">
                      {apiKey ?? "Generating..."}
                    </code>
                    <button
                      onClick={handleCopy}
                      disabled={!apiKey}
                      className="px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3c */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Paste it in the extension popup
                  </p>
                  <p className="text-xs text-gray-500">
                    Click the extension icon{" "}
                    <span className="inline-block bg-gray-100 rounded px-1 text-xs">🧩</span>{" "}
                    in your Chrome toolbar, paste your API key and click{" "}
                    <span className="font-medium">Save & Connect</span>.
                  </p>
                </div>
              </div>

              {/* Step 3d */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Go to Facebook and start importing
                  </p>
                  <p className="text-xs text-gray-500">
                    Visit any Facebook post or profile. You'll see an{" "}
                    <span className="font-medium text-purple-600">⬇ Import</span> button
                    appear next to the Like/Comment/Share actions.
                  </p>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6">
              <p className="text-xs text-blue-700 leading-relaxed">
                💡 You can always find your API key again in the{" "}
                <span className="font-semibold">Settings</span> section of your dashboard.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to my pipeline →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}