import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({
  children,
  title,
  pipelineId,
}: {
  children: React.ReactNode;
  title: string;
  pipelineId: string;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-24">
        <Topbar initialTitle={title} pipelineId={pipelineId} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}