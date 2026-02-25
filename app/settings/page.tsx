import AppShell from "../components/layout/AppShell";
import ApiKeyPanel from "../components/settings/ApiKeyPanel";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" pipelineId="">
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Manage your account and integrations.</p>
        <ApiKeyPanel />
      </div>
    </AppShell>
  );
}
