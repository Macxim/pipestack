import AppShell from "./components/layout/AppShell";
import PipelineBoard from "./components/pipeline/PipelineBoard";
import { mockPipeline } from "./data/mockPipeline";

export default function Home() {
  return (
    <AppShell>
      <PipelineBoard pipeline={mockPipeline} />
    </AppShell>
  );
}