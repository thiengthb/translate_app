import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";

import { streakApi } from "@/api/features/streak.api";
import type { CalendarResponse, StreakResponse } from "@/types/features/streak";
import type { RootState } from "@/store/store";

const STREAK_QUERY_KEY = ["streak", "me"] as const;
const CHECK_IN_FLAG_KEY = "streak-last-check-in"; // localStorage flag to avoid duplicate POSTs

export function useMyStreak(enabled = true) {
    return useQuery<StreakResponse>({
        queryKey: STREAK_QUERY_KEY,
        queryFn: streakApi.getMyStreak,
        enabled,
        staleTime: 60 * 1000,
    });
}

export function useStreakCalendar(year: number, month: number, enabled = true) {
    return useQuery<CalendarResponse>({
        queryKey: ["streak", "calendar", year, month],
        queryFn: () => streakApi.getCalendar(year, month),
        enabled,
        staleTime: 60 * 1000,
    });
}

/**
 * Auto-checks-in once per local-day per authenticated session.
 * Should be mounted once at the layout level.
 */
export function useAutoCheckIn() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const queryClient = useQueryClient();
    const ran = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || ran.current) return;
        ran.current = true;

        const today = new Date().toISOString().slice(0, 10);
        const lastFlag = localStorage.getItem(CHECK_IN_FLAG_KEY);
        if (lastFlag === today) return; // already checked in today on this device

        streakApi
            .checkIn()
            .then((res) => {
                localStorage.setItem(CHECK_IN_FLAG_KEY, today);
                queryClient.setQueryData(STREAK_QUERY_KEY, res.streak);
            })
            .catch(() => {
                // silent — feature is best-effort, never blocks the user
            });
    }, [isAuthenticated, queryClient]);
}
