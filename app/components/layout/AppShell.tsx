import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({
  children,
  title,
  pipelineId,
  isEditable,
}: {
  children: React.ReactNode;
  title: string;
  pipelineId: string;
  isEditable?: boolean;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-24">
        <Topbar initialTitle={title} pipelineId={pipelineId} isEditable={isEditable} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}