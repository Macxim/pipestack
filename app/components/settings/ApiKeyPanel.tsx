"use client";

import { useEffect, useState } from "react";

export default function ApiKeyPanel() {
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetch("/api/auth/api-key")
      .then((r) => r.json())
      .then((d) => { setKey(d.key); setLoading(false); });
  }, []);

  const copy = () => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!confirm("Regenerate your API key? Your extension will stop working until you update it.")) return;
    setRegenerating(true);
    const res = await fetch("/api/auth/api-key", { method: "POST" });
    const data = await res.json();
    setKey(data.key);
    setRegenerating(false);
  };

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Extension API Key</h3>
      <p className="text-xs text-gray-500 mb-4">
        Paste this key into your Chrome extension to connect it to your account.
      </p>

      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 truncate">
          {key}
        </code>
        <button
          onClick={copy}
          className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <button
        onClick={regenerate}
        disabled={regenerating}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        {regenerating ? "Regenerating..." : "Regenerate key"}
      </button>
    </div>
  );
}