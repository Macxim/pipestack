import { Pipeline } from "../types/pipeline";

export const mockPipeline: Pipeline = {
  id: "pipeline-1",
  title: "FB28 - FCSF Outreach",
  stages: [
    {
      id: "lead-in",
      title: "Lead In",
      color: "#3b82f6",
      leads: [
        { id: "l1", name: "Tomasz Frączak", value: 0 },
        { id: "l2", name: "Tomaž Hribernik", value: 0 },
        { id: "l3", name: "Tonmoy Khandakar", value: 0 },
        { id: "l4", name: "Tony Roland", value: 0 },
      ],
    },
    {
      id: "friend-request",
      title: "Friend Request Sent",
      color: "#8b5cf6",
      leads: [
        { id: "l5", name: "Vivian Fernandes", value: 0 },
        { id: "l6", name: "Chris Anderson", value: 1997 },
      ],
    },
    {
      id: "invite-sent",
      title: "Invite To Group Sent",
      color: "#f59e0b",
      leads: [
        { id: "l7", name: "Hanna Hellman", value: 0 },
        { id: "l8", name: "Harry G Jung", value: 0 },
        { id: "l9", name: "Hayden Rolfe", value: 4000 },
      ],
    },
    {
      id: "follow-up-48",
      title: "48Hr Follow Up",
      color: "#ec4899",
      leads: [
        { id: "l10", name: "Amanda Steinberg", value: 1997 },
        { id: "l11", name: "Freya Augustin", value: 1997 },
        { id: "l12", name: "Erica Parr", value: 1997 },
      ],
    },
    {
      id: "demo-booked",
      title: "Demo Booked",
      color: "#10b981",
      leads: [
        { id: "l13", name: "Forrest Sauer", value: 1997 },
        { id: "l14", name: "Sheree Owen", value: 1997 },
        { id: "l15", name: "Stephanie Hess", value: 0 },
      ],
    },
    {
      id: "closed",
      title: "Closed / Won",
      color: "#06b6d4",
      leads: [
        { id: "l16", name: "James Hilliard", value: 1997 },
        { id: "l17", name: "Raymond Hollaar", value: 1997 },
      ],
    },
  ],
};