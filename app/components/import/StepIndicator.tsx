"use client";

import { Step } from "./types";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload",  label: "Upload"      },
  { key: "mapping", label: "Map columns" },
  { key: "preview", label: "Preview"     },
  { key: "result",  label: "Done"        },
];

export default function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const last = i === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">

            {/* Pill */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                isDone
                  ? "bg-blue-50 text-blue-600"
                  : isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {/* Icon circle */}
              <div
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200 ${
                  isDone
                    ? "bg-blue-600 text-white"
                    : isActive
                    ? "bg-white/25 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              {step.label}
            </div>

            {/* Connector line */}
            {!last && (
              <div
                className={`flex-1 mx-1.5 h-px min-w-[8px] transition-colors duration-300 ${
                  isDone ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}

          </div>
        );
      })}
    </div>
  );
}