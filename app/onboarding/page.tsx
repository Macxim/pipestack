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

const STAGE_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#ef4444", // red
  "#10b981", // green
  "#06b6d4", // cyan
  "#f97316", // orange
];

const FEATURES = [
  {
    icon: "📥",
    title: "Multi-channel Lead Import",
    desc: "Import from Facebook comments in one click or bulk upload your existing CSVs.",
  },
  {
    icon: "📋",
    title: "Visual Command Center",
    desc: "Drag cards AND columns to organize your flow. Total control over your pipeline.",
  },
  {
    icon: "🔔",
    title: "Smart Follow-ups",
    desc: "Reminders ensure you never miss a beat. Keep your sales process moving.",
  },
  {
    icon: "⚡",
    title: "Power Tools for Scale",
    desc: "Bulk actions, manual lead entry, and advanced filtering for high-volume outreach.",
  },
];

const ONBOARDING_STEPS = [
  { key: 1, label: "Welcome"   },
  { key: 2, label: "Pipeline"  },
  { key: 3, label: "Stages"    },
  { key: 4, label: "Extension" },
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
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);

  // Close color picker on outside click
  useEffect(() => {
    if (colorPickerIndex === null) return;
    const handleClickOutside = () => setColorPickerIndex(null);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerIndex]);

  const updateStageTitle = (i: number, title: string) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, title } : s)));

  const updateStageColor = (i: number, color: string) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, color } : s)));

  const removeStage = (i: number) =>
    setStages((prev) => prev.filter((_, idx) => idx !== i));

  const addStage = () =>
    setStages((prev) => [...prev, { title: "New Stage", color: "#3b82f6" }]);

  const handleCopy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
      title: s.title || "New Stage",
      color: s.color,
      position: i,
    }));

    const { error: stagesError } = await supabase.from("stages").insert(stageRows);
    if (stagesError) {
      setError("Failed to create stages. Please try again.");
      setLoading(false);
      return;
    }

    // Generate API key and move to step 4
    try {
      const res = await fetch("/api/auth/api-key");
      const data = await res.json();
      setApiKey(data.key);
      setStep(4);
    } catch (err) {
      console.error("Failed to generate API key:", err);
      setApiKey("Failed to generate — visit Settings to get your key.");
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-lg">
          
          {/* Step Indicator */}
          <div className="flex items-center w-full mb-10">
            {ONBOARDING_STEPS.map((s, i) => {
              const isDone = s.key < step;
              const isActive = s.key === step;
              const isLast = i === ONBOARDING_STEPS.length - 1;

              return (
                <div key={s.key} className="flex items-center flex-1 min-w-0">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                      isDone
                        ? "bg-blue-50 text-blue-600"
                        : isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-200 ${
                        isDone
                          ? "bg-blue-600 text-white"
                          : isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isDone ? "✓" : s.key}
                    </div>
                    {s.label}
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 mx-2 h-px min-w-[4px] transition-colors duration-300 ${
                        isDone ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div key={1} style={{ animation: "stepIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div className="text-4xl mb-4">🚀</div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                Your Facebook leads, organized.
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Pipestack turns Facebook comments into a sales pipeline.
                Import contacts in seconds, track follow-ups, close more deals.
              </p>

              <div className="space-y-4 mb-8">
                {FEATURES.map((f) => (
                  <div key={f.title} className="flex gap-3 pl-3 border-l-2 border-blue-100">
                    <span className="text-xl shrink-0">{f.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 text-sm font-semibold text-white bg-blue-600
                  rounded-xl hover:bg-blue-700 transition-colors"
              >
                Get started →
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Already have an account?{" "}
                <a href="/login" className="text-blue-600 font-medium hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          )}

          {/* ── Step 2: Name Your Pipeline ── */}
          {step === 2 && (
            <div key={2} style={{ animation: "stepIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div className="text-4xl mb-4">✏️</div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                Name your pipeline
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                This is the name of your outreach campaign.
                You can create more pipelines later.
              </p>

              <div className="mb-6">
                <input
                  autoFocus
                  type="text"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value.slice(0, 60))}
                  placeholder="e.g. FB Outreach Q1, January Campaign..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => { if (e.key === "Enter") setStep(3); }}
                />
                {pipelineName.length > 40 && (
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {pipelineName.length}/60
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
                    rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600
                    rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Set Up Stages ── */}
          {step === 3 && (
            <div key={3} style={{ animation: "stepIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div className="text-4xl mb-4">🗂️</div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                Set up your stages
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                These become the columns on your board. Edit them to match
                your workflow — you can always change them later.
              </p>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {stages.length} stage{stages.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={addStage}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  + Add stage
                </button>
              </div>

              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setColorPickerIndex(colorPickerIndex === i ? null : i)}
                        className="w-4 h-4 rounded-full shrink-0 ring-2 ring-offset-1
                          ring-transparent hover:ring-gray-200 transition-all"
                        style={{ backgroundColor: stage.color }}
                        title="Change color"
                      />

                      {colorPickerIndex === i && (
                        <div className="absolute top-6 left-0 z-10 bg-white border border-gray-200
                          rounded-xl p-2 shadow-lg flex gap-1.5">
                          {STAGE_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                updateStageColor(i, color);
                                setColorPickerIndex(null);
                              }}
                              className={`w-5 h-5 rounded-full transition-transform hover:scale-110
                                ${stage.color === color ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={stage.title}
                      onChange={(e) => updateStageTitle(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && i === stages.length - 1) {
                          e.preventDefault();
                          addStage();
                        }
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {stages.length > 1 && (
                      <button
                        onClick={() => removeStage(i)}
                        className="text-gray-300 hover:text-red-400 transition-colors
                          w-6 shrink-0 text-base leading-none"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
                    rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600
                    rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Setting up..." : "Set up my pipeline →"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Connect the Extension ── */}
          {step === 4 && (
            <div key={4} style={{ animation: "stepIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div className="text-4xl mb-4">🧩</div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                Connect the Chrome extension
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                The extension lets you import leads directly from Facebook.
                Takes about 2 minutes.
              </p>

              <div className="space-y-5 mb-6">
                {/* Step 1: Install */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs
                    font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Install the extension
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Open Chrome and go to{" "}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                        chrome://extensions
                      </code>
                      , enable <span className="font-medium">Developer Mode</span>,
                      click <span className="font-medium">"Load unpacked"</span> and
                      select the extension folder.
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5 italic">
                      The extension will be available on the Chrome Web Store soon.
                    </p>
                  </div>
                </div>

                {/* Step 2: API key */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs
                    font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Copy your API key
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      This connects the extension to your account. Keep it private.
                    </p>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200
                        rounded-lg px-3 py-2">
                        <code className="text-xs font-mono text-gray-700 block truncate">
                          {apiKey ?? "Generating..."}
                        </code>
                      </div>
                      <button
                        onClick={handleCopy}
                        disabled={!apiKey}
                        className={`
                          px-3 py-2 text-xs font-semibold rounded-lg shrink-0
                          transition-all duration-150
                          ${copied
                            ? "bg-green-500 text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                          }
                          disabled:opacity-50
                        `}
                      >
                        {copied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3: Paste in popup */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs
                    font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Paste it in the extension
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Click the{" "}
                      <span className="inline-flex items-center gap-1 bg-gray-100
                        px-1.5 py-0.5 rounded text-xs font-medium">
                        🧩 Pipestack
                      </span>{" "}
                      icon in Chrome, paste your key, click{" "}
                      <span className="font-medium">Save & Connect</span>.
                    </p>
                  </div>
                </div>

                {/* Step 4: Go import */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs
                    font-bold flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Go to Facebook and start importing
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Open any Facebook post. You'll see a{" "}
                      <span className="font-semibold text-blue-600">
                        ⬇ Import commenters
                      </span>{" "}
                      button appear. Click it — leads will appear on your board
                      in seconds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-6">
                <p className="text-xs text-blue-700 leading-relaxed">
                  💡 Your API key is always available in{" "}
                  <span className="font-semibold">Settings</span> if you need it again.
                </p>
              </div>

              <p className="text-xs text-center text-gray-400 mb-3">
                You're all set. Your pipeline is ready.
              </p>

              <button
                onClick={() => { router.push("/"); router.refresh(); }}
                className="w-full py-3 text-sm font-semibold text-white bg-blue-600
                  rounded-xl hover:bg-blue-700 transition-colors"
              >
                Go to my pipeline →
              </button>

              <p className="text-center mt-3">
                <button
                  onClick={() => { router.push("/"); router.refresh(); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors
                    underline underline-offset-2"
                >
                  Skip for now
                </button>
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}