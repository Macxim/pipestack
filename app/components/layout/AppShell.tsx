import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FollowUpProvider } from "@/app/context/FollowUpContext";

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
    <FollowUpProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 ml-24 min-h-0 overflow-hidden">
          <Topbar initialTitle={title} pipelineId={pipelineId} isEditable={isEditable} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">{children}</main>
        </div>
      </div>
    </FollowUpProvider>
  );
}