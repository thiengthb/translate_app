// ─────────────────────────────────────────────────────────────────────────────
// Sakura Study Dashboard — data contract
// Drop into: src/components/sakura-dashboard/sakura-dashboard.types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type MissionAccent = "mint" | "sakura" | "honey";
export type MissionStatus = "completed" | "in-progress" | "challenge";

export interface Mission {
  id: string;
  /** e.g. "Class 1" */
  className: string;
  /** e.g. "THINKING" — rendered uppercase by design */
  title: string;
  description: string;
  /** small pill label, e.g. "video" */
  kind: string;
  status: MissionStatus;
  /** drives the card's color world */
  accent: MissionAccent;
  done: number;
  total: number;
  /** optional small illustration; falls back to a built-in decorative SVG */
  illustrationUrl?: string;
}

export type DayState = "default" | "selected" | "active" | "today" | "muted";

export interface CalendarDay {
  label: string;
  state: DayState;
}

export interface CalendarMonth {
  /** e.g. "7" or "July" — shown as-is */
  monthLabel: string;
  year: number;
  /** flat list, rendered into a 7-col grid (typically 35 cells) */
  days: CalendarDay[];
}

export interface AchievementPoint {
  /** weekday label under the chart, e.g. "Mon" */
  label: string;
  /** 0..100 */
  value: number;
}

export interface Achievement {
  /** e.g. "week" */
  rangeLabel: string;
  points: AchievementPoint[];
  /** index of the point that shows the % callout (the peak) */
  peakIndex: number;
}

export interface SakuraDashboardProps {
  user: { name: string; avatarUrl?: string; studyDay: number };
  heroIllustrationUrl?: string;
  missions: Mission[];
  calendar: CalendarMonth;
  achievement: Achievement;
  stats: { ranking: number; progressPct: number; donutPct: number };
  onReturn?: () => void;
  onNavigate?: (key: "home" | "lessons" | "settings" | "library") => void;
  /** Power button in the sidebar footer (e.g. log out). */
  onPower?: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample data — handy for a first render / Storybook
// ─────────────────────────────────────────────────────────────────────────────

export const defaultSakuraData: Omit<
  SakuraDashboardProps,
  "onReturn" | "onNavigate" | "className"
> = {
  user: { name: "Heer", studyDay: 1 },
  missions: [
    {
      id: "c1",
      className: "Class 1",
      title: "THINKING",
      description:
        "Participate in training, unlock new tasks and achieve results",
      kind: "video",
      status: "completed",
      accent: "mint",
      done: 4,
      total: 6,
    },
    {
      id: "c2",
      className: "Class 2",
      title: "Self-Control",
      description:
        "Participate in training, unlock new tasks and achieve results",
      kind: "video",
      status: "in-progress",
      accent: "sakura",
      done: 5,
      total: 6,
    },
    {
      id: "c3",
      className: "Class 3",
      title: "CHALLENGE",
      description:
        "Participate in training, unlock new tasks and achieve results",
      kind: "video",
      status: "challenge",
      accent: "honey",
      done: 2,
      total: 6,
    },
  ],
  calendar: {
    monthLabel: "7",
    year: 2022,
    days: [
      ..."1234567".split("").map((d, i) => ({
        label: d,
        state: (i === 6 ? "selected" : "default") as DayState,
      })),
      ...["8", "9", "10", "11", "12", "13", "14"].map((d) => ({
        label: d,
        state: (["11", "12", "13"].includes(d) ? "active" : "default") as DayState,
      })),
      ...["15", "16", "17", "18", "19", "20", "21"].map((d) => ({
        label: d,
        state: (d === "17" ? "today" : "default") as DayState,
      })),
      ...["22", "23", "24", "25", "26", "27", "28"].map((d) => ({
        label: d,
        state: "default" as DayState,
      })),
      ...["29", "30", "31", "1", "2", "3", "4"].map((d, i) => ({
        label: d,
        state: (i >= 3 ? "muted" : "default") as DayState,
      })),
    ],
  },
  achievement: {
    rangeLabel: "week",
    peakIndex: 2,
    points: [
      { label: "Mon", value: 40 },
      { label: "Tue", value: 55 },
      { label: "Wed", value: 80 },
      { label: "Thu", value: 52 },
      { label: "Fri", value: 62 },
      { label: "Sat", value: 50 },
      { label: "Sun", value: 60 },
    ],
  },
  stats: { ranking: 15, progressPct: 60, donutPct: 60 },
};
