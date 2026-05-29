import { useQuery } from "@tanstack/react-query";
import { leaderboardApi } from "@/api/features/leaderboard.api";
import type {
    LeaderboardEntry,
    LeaderboardSort,
    PublicProfileResponse,
} from "@/types/features/leaderboard";

export function useLeaderboard(limit = 50, sortBy: LeaderboardSort = "current") {
    return useQuery<LeaderboardEntry[]>({
        queryKey: ["leaderboard", limit, sortBy],
        queryFn: () => leaderboardApi.getLeaderboard(limit, sortBy),
        staleTime: 60 * 1000,
    });
}

export function usePublicProfile(userId: number | string | undefined) {
    return useQuery<PublicProfileResponse>({
        queryKey: ["public-profile", userId],
        queryFn: () => leaderboardApi.getPublicProfile(userId as number),
        enabled: userId != null,
        retry: false,
    });
}
