import { Pipeline } from "@/app/types/pipeline";
import { getFollowUpStatus } from "./follow-up-status";

export type FollowUpCounts = {
  overdue: number;
  today: number;
  total: number; // overdue + today combined
};

export function getFollowUpCounts(pipeline: Pipeline): FollowUpCounts {
  const allLeads = pipeline.stages.flatMap((s) => s.leads);

  let overdue = 0;
  let today = 0;

  allLeads.forEach((lead) => {
    const status = getFollowUpStatus(lead.followUpDate);
    if (status.state === "overdue") overdue++;
    if (status.state === "today") today++;
  });

  return {
    overdue,
    today,
    total: overdue + today,
  };
}
