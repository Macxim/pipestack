"use client";

import { useRef } from "react";
import AppShell from "@/app/components/layout/AppShell";
import PipelineBoardWrapper from "@/app/components/pipeline/PipelineBoardWrapper";
import { PipelineBoardHandle } from "@/app/components/pipeline/PipelineBoard";
import { Pipeline } from "@/app/types/pipeline";

type Props = {
  pipelineData: Pipeline;
};

export default function PipelinePageClient({ pipelineData }: Props) {
  const boardRef = useRef<PipelineBoardHandle>(null);

  const handleSelectLead = (lead: any) => {
    boardRef.current?.openLead(lead.id);
  };

  return (
    <AppShell 
      title={pipelineData.title} 
      pipelineId={pipelineData.id} 
      onSelectLead={handleSelectLead}
    >
      <PipelineBoardWrapper ref={boardRef} initialPipeline={pipelineData} />
    </AppShell>
  );
}
