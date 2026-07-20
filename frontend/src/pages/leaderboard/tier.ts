import type { LeaderboardSort } from "@/types/features/leaderboard";

/**
 * A learner's prestige tier — the Hanabun answer to an esports "rank" column.
 * It's a pure function of the personal best (`longestStreak`), so it's the one
 * badge that can't be lost by breaking today's streak: the flower you once grew
 * stays grown. Named as flower-growth stages to fit the Sakura world.
 */
export interface Tier {
    label: string;
    emoji: string;
    /** Text / icon color. */
    color: string;
    /** Soft fill behind the badge. */
    bg: string;
    /** Badge border. */
    border: string;
}

const TIERS: { min: number; tier: Tier }[] = [
    { min: 100, tier: { label: "Mãn khai", emoji: "🏵️", color: "#E0A02E", bg: "#FFF6E2", border: "#FFE2A8" } },
    { min: 30, tier: { label: "Rực rỡ", emoji: "🌺", color: "#FF6B9D", bg: "#FFE5EC", border: "#FFC2D4" } },
    { min: 7, tier: { label: "Chớm nở", emoji: "🌸", color: "#FF8FAB", bg: "#FFF0F4", border: "#FFD7E1" } },
    { min: 1, tier: { label: "Nảy mầm", emoji: "🌱", color: "#5FB593", bg: "#EAFBF3", border: "#BDEBD8" } },
    { min: 0, tier: { label: "Hạt giống", emoji: "🌰", color: "#9A8E92", bg: "#F6F2F3", border: "#EFE6E8" } },
];

export function getTier(longestStreak: number): Tier {
    return (TIERS.find((t) => longestStreak >= t.min) ?? TIERS[TIERS.length - 1]).tier;
}

/** Metadata for each sortable metric — drives the tabs, columns and emphasis. */
export interface Metric {
    key: LeaderboardSort;
    /** Which numeric field on an entry this metric reads. */
    field: "currentStreak" | "longestStreak" | "totalActiveDays";
    /** Short column header. */
    short: string;
    /** Tab label. */
    tab: string;
    icon: string;
    /** Accent used when this metric is the active sort. */
    accent: string;
}

export const METRICS: Metric[] = [
    { key: "current", field: "currentStreak", short: "Streak", tab: "Streak hiện tại", icon: "🔥", accent: "#FF6B9D" },
    { key: "longest", field: "longestStreak", short: "Kỷ lục", tab: "Chuỗi dài nhất", icon: "🏆", accent: "#E0A02E" },
    { key: "active", field: "totalActiveDays", short: "Ngày học", tab: "Tổng ngày học", icon: "📅", accent: "#5FB593" },
];

export const metricFor = (key: LeaderboardSort): Metric =>
    METRICS.find((m) => m.key === key) ?? METRICS[0];
