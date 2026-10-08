export interface UserInfo {
  id: string;
  name: string;
  email: string;
}
export interface LinkInfo {
  id: string;
  originalUrl: string;
  code: string;
  shortUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  clicks: number;
  status: "active" | "disabled" | "expired";
}
export interface LinkList {
  links: LinkInfo[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
export interface StatsInfo {
  summary: { totalLinks: number; activeLinks: number; totalClicks: number };
  from: string;
  to: string;
  timezone: string;
  periodClicks: number;
  daily: { date: string; clicks: number }[];
  sources: { name: string; clicks: number }[];
  devices: { name: string; clicks: number }[];
}
