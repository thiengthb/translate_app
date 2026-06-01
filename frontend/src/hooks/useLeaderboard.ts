import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { leaderboardApi } from "@/api/features/leaderboard.api";
import type { RootState } from "@/store/store";
import type {
    LeaderboardEntry,
    LeaderboardSort,
    PublicProfileResponse,
} from "@/types/features/leaderboard";

export function useLeaderboard(limit = 50, sortBy: LeaderboardSort = "current") {
    // GET /leaderboard requires auth — gate on the auth flag so a guest who
    // reaches this page (e.g. via a module manually flagged isPublic) doesn't
    // fire a 401 → /auth/refresh → redirect.
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
    return useQuery<LeaderboardEntry[]>({
        queryKey: ["leaderboard", limit, sortBy],
        queryFn: () => leaderboardApi.getLeaderboard(limit, sortBy),
        enabled: isAuthenticated,
        staleTime: 60 * 1000,
    });
}

export function usePublicProfile(userId: number | string | undefined) {
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
    return useQuery<PublicProfileResponse>({
        queryKey: ["public-profile", userId],
        queryFn: () => leaderboardApi.getPublicProfile(userId as number),
        enabled: isAuthenticated && userId != null,
        retry: false,
    });
}
