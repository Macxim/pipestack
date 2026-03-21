import AppShell from "../components/layout/AppShell";
import ApiKeyPanel from "../components/settings/ApiKeyPanel";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" pipelineId="" isEditable={false}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your account and integrations.
            </p>
          </div>
          <ApiKeyPanel />
        </div>
    </AppShell>
  );
}
