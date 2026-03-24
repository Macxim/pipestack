"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { FollowUpCounts } from "@/lib/follow-up-counts";

import { Pipeline } from "@/app/types/pipeline";

type FollowUpContextType = {
  counts: FollowUpCounts;
  setCounts: (counts: FollowUpCounts) => void;
  pipeline: Pipeline | null;
  setPipeline: (pipeline: Pipeline) => void;
};

const defaultCounts: FollowUpCounts = { overdue: 0, today: 0, total: 0 };

const FollowUpContext = createContext<FollowUpContextType>({
  counts: defaultCounts,
  setCounts: () => {},
  pipeline: null,
  setPipeline: () => {},
});

export function FollowUpProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<FollowUpCounts>(defaultCounts);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);

  return (
    <FollowUpContext.Provider value={{ counts, setCounts, pipeline, setPipeline }}>
      {children}
    </FollowUpContext.Provider>
  );
}

export function useFollowUpCounts() {
  return useContext(FollowUpContext);
}
