export interface LeaderboardEntry {
    rank: number;
    userId: number;
    fullName: string;
    avatarUrl?: string | null;
    roles: string[];
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
}

export interface PublicProfileStreakSummary {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    lastActivityDate?: string | null;
}

export interface PublicProfileResponse {
    id: number;
    fullName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    roles: string[];
    createdAt?: string | null;
    streak: PublicProfileStreakSummary;
}

export type LeaderboardSort = "current" | "longest" | "active";
