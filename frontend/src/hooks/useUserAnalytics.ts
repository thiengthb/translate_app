import { useQuery } from "@tanstack/react-query";
import { userAnalyticsApi } from "@/api/features/userAnalytics.api";
import type { UserAnalyticsResponse } from "@/types/features/dashboard";

export function useUserAnalytics(growthDays = 30) {
    return useQuery<UserAnalyticsResponse>({
        queryKey: ["user-analytics", growthDays],
        queryFn: () => userAnalyticsApi.getAnalytics(growthDays),
        staleTime: 60 * 1000,
    });
}
