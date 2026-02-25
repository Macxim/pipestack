"use client";

import { useState } from "react";
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

  const updateStageTitle = (i: number, title: string) => {
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, title } : s)));
  };

  const removeStage = (i: number) => {
    setStages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addStage = () => {
    setStages((prev) => [...prev, { title: "New Stage", color: "#6b7280" }]);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Create pipeline
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

    // Create stages
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

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-lg">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-blue-600" : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
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

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Set up your stages
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              We've added some defaults. Edit, remove, or add stages to match your workflow.
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
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none w-6 shrink-0"
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
                {loading ? "Setting up..." : "Launch my pipeline 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}