export type LeadStatus = "overdue" | "today" | "upcoming" | "none";

export type Lead = {
  id: string;
  name: string;
  value: number;
  status: LeadStatus;
  email?: string;
  phone?: string;
  notes?: string;
  followUpDate?: string;
  createdAt?: string;
  avatarUrl?: string;
  profileUrl?: string;
  platform?: string;
};

export type Stage = {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
};

export type Pipeline = {
  id: string;
  title: string;
  stages: Stage[];
};