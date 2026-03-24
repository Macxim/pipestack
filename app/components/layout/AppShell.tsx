"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FollowUpProvider, useFollowUpCounts } from "@/app/context/FollowUpContext";
import SearchPalette from "@/app/components/search/SearchPalette";
import { useRouter, usePathname } from "next/navigation";

function AppShellInner({
  children,
  title,
  pipelineId,
  isEditable,
  onSelectLead,
}: {
  children: React.ReactNode;
  title: string;
  pipelineId: string;
  isEditable?: boolean;
  onSelectLead?: (lead: any, stageName: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { pipeline } = useFollowUpCounts();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      // Forward slash — only when not focused in an input/textarea/select
      if (e.key === "/" && !searchOpen) {
        const target = e.target as HTMLElement;
        const tag = target?.tagName;
        const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || target?.isContentEditable;
        
        if (!isInput) {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  const handleSelect = (lead: any, stageName: string) => {
    if (pathname === "/" && onSelectLead) {
      onSelectLead(lead, stageName);
    } else {
      // Store pending lead ID for root page to pick up on mount
      sessionStorage.setItem("pipestack_open_lead", lead.id);
      if (pathname === "/") {
        // We are already on root but maybe no boardRef was provided?
        // In that case, we can't do much, but the board's own useEffect will pick it up on next render.
        window.location.reload(); // Fallback to make sure useEffect in Board runs
      } else {
        router.push("/");
      }
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-24 min-h-0 overflow-hidden">
        <Topbar 
          initialTitle={title} 
          pipelineId={pipelineId} 
          isEditable={isEditable} 
          onSearchOpen={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">
          {children}
        </main>
      </div>

      {searchOpen && pipeline && (
        <SearchPalette
          pipeline={pipeline}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelectLead={handleSelect}
        />
      )}
    </div>
  );
}

export default function AppShell(props: {
  children: React.ReactNode;
  title: string;
  pipelineId: string;
  isEditable?: boolean;
  onSelectLead?: (lead: any, stageName: string) => void;
}) {
  return (
    <FollowUpProvider>
      <AppShellInner {...props} />
    </FollowUpProvider>
  );
}