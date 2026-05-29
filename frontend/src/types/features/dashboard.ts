export interface UserAnalyticsSummary {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    newUsersLastMonth: number;
    growthPercent: number;
}

export interface RoleDistribution {
    role: string;
    count: number;
}

export interface GrowthPoint {
    date: string; // ISO yyyy-MM-dd
    count: number;
}

export interface RecentUser {
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    roles: string[];
    createdAt?: string | null;
}

export interface TopStreakUser {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    currentStreak: number;
    longestStreak: number;
}

export interface UserAnalyticsResponse {
    summary: UserAnalyticsSummary;
    roleDistribution: RoleDistribution[];
    growth: GrowthPoint[];
    recentUsers: RecentUser[];
    topStreaks: TopStreakUser[];
}
