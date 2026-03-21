export type FollowUpStatus =
  | { state: "overdue"; label: string; color: string; border: string }
  | { state: "today"; label: string; color: string; border: string }
  | { state: "tomorrow"; label: string; color: string; border: string }
  | { state: "soon"; label: string; color: string; border: string }
  | { state: "future"; label: string; color: string; border: string }
  | { state: "none" };

export function getFollowUpStatus(followUpDate: string | null | undefined): FollowUpStatus {
  if (!followUpDate) return { state: "none" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(followUpDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      state: "overdue",
      label: "Overdue",
      color: "#ef4444",
      border: "#ef4444",
    };
  }

  if (diffDays === 0) {
    return {
      state: "today",
      label: "Today",
      color: "#f59e0b",
      border: "#f59e0b",
    };
  }

  if (diffDays === 1) {
    return {
      state: "tomorrow",
      label: "Tomorrow",
      color: "#3b82f6",
      border: "#3b82f6",
    };
  }

  if (diffDays <= 7) {
    return {
      state: "soon",
      label: `In ${diffDays} days`,
      color: "#3b82f6",
      border: "#3b82f6",
    };
  }

  // Format as "Apr 3"
  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    state: "future",
    label: formatted,
    color: "#94a3b8",
    border: "transparent",
  };
}
