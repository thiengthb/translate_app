import axiosInstance from "../axios";
import type { UserAnalyticsResponse } from "@/types/features/dashboard";

export const userAnalyticsApi = {
    getAnalytics: async (growthDays = 30): Promise<UserAnalyticsResponse> => {
        const response = await axiosInstance.get<UserAnalyticsResponse>(
            "/dashboard/users/analytics",
            { params: { growthDays } },
        );
        return response.data;
    },
};
