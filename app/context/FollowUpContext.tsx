"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { FollowUpCounts } from "@/lib/follow-up-counts";

type FollowUpContextType = {
  counts: FollowUpCounts;
  setCounts: (counts: FollowUpCounts) => void;
};

const defaultCounts: FollowUpCounts = { overdue: 0, today: 0, total: 0 };

const FollowUpContext = createContext<FollowUpContextType>({
  counts: defaultCounts,
  setCounts: () => {},
});

export function FollowUpProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<FollowUpCounts>(defaultCounts);
  return (
    <FollowUpContext.Provider value={{ counts, setCounts }}>
      {children}
    </FollowUpContext.Provider>
  );
}

export function useFollowUpCounts() {
  return useContext(FollowUpContext);
}
