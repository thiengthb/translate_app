// ─────────────────────────────────────────────────────────────────────────────
// Sakura Study Dashboard — data contract
// ─────────────────────────────────────────────────────────────────────────────

export type MissionAccent = "mint" | "sakura" | "honey";
export type MissionStatus = "completed" | "in-progress" | "challenge";

export interface Mission {
  id: string;
  /** e.g. "Hằng ngày" */
  className: string;
  /** e.g. "ĐIỂM DANH" — rendered uppercase by design */
  title: string;
  description: string;
  /** small pill label, e.g. "check-in" */
  kind: string;
  status: MissionStatus;
  /** drives the card's color world */
  accent: MissionAccent;
  done: number;
  total: number;
  /** optional route — the card becomes clickable and navigates here */
  to?: string;
  /** optional small illustration; falls back to a built-in decorative SVG */
  illustrationUrl?: string;
}

export interface AchievementPoint {
  /** weekday label under the chart, e.g. "T2" */
  label: string;
  /** 0..100 — drives the curve's y position */
  value: number;
  /** raw metric behind the point (e.g. EXP earned); shown in the callout */
  raw?: number;
}

export interface Achievement {
  /** e.g. "tuần này" */
  rangeLabel: string;
  points: AchievementPoint[];
  /** index of the point that shows the callout (the peak) */
  peakIndex: number;
}

export interface SakuraDashboardStats {
  /** leaderboard position — string fallback ("—") when unranked */
  ranking: number | string;
  progressPct: number;
  donutPct: number;
  /** caption under the donut, e.g. "3/7 ngày học tuần này" */
  donutCaption?: string;
}

export interface SakuraDashboardProps {
  user: { name: string; avatarUrl?: string; studyDay: number };
  heroIllustrationUrl?: string;
  missions: Mission[];
  achievement: Achievement;
  stats: SakuraDashboardStats;
}
