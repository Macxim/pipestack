"use client";

import { useRouter } from "next/navigation";
import { ImportResult } from "../types";

type Props = {
  result: ImportResult;
  onImportAnother: () => void;
};

export default function StepResult({ result, onImportAnother }: Props) {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      {/* Icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">✓</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Import complete</h2>
      <p className="text-sm text-gray-500 mb-8">Your leads have been added to your pipeline.</p>

      {/* Result counts */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
          <p className="text-3xl font-bold text-green-600">{result.imported}</p>
          <p className="text-xs text-gray-500 mt-1">imported</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
          <p className="text-3xl font-bold text-amber-500">{result.skipped}</p>
          <p className="text-xs text-gray-500 mt-1">skipped</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
          <p className="text-3xl font-bold text-red-500">{result.failed}</p>
          <p className="text-xs text-gray-500 mt-1">failed</p>
        </div>
      </div>

      {/* Error details */}
      {result.errors.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 text-left">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Failed rows</p>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs text-red-600">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onImportAnother}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Import another file
        </button>
        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to my pipeline →
        </button>
      </div>
    </div>
  );
}
