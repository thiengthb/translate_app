import axiosInstance from "../axios";
import type {
    LeaderboardEntry,
    LeaderboardSort,
    PublicProfileResponse,
} from "@/types/features/leaderboard";

export const leaderboardApi = {
    getLeaderboard: async (
        limit = 50,
        sortBy: LeaderboardSort = "current",
    ): Promise<LeaderboardEntry[]> => {
        const response = await axiosInstance.get<LeaderboardEntry[]>("/leaderboard", {
            params: { limit, sortBy },
        });
        return response.data;
    },

    getPublicProfile: async (userId: number | string): Promise<PublicProfileResponse> => {
        const response = await axiosInstance.get<PublicProfileResponse>(
            `/users/${userId}/public-profile`,
        );
        return response.data;
    },
};
