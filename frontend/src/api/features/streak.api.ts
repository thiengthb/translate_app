import axiosInstance from "../axios";
import type {
    CalendarResponse,
    CheckInResponse,
    StreakResponse,
} from "@/types/features/streak";

export const streakApi = {
    checkIn: async (): Promise<CheckInResponse> => {
        const response = await axiosInstance.post<CheckInResponse>("/streak/check-in");
        return response.data;
    },

    getMyStreak: async (): Promise<StreakResponse> => {
        const response = await axiosInstance.get<StreakResponse>("/streak/me");
        return response.data;
    },

    getCalendar: async (year?: number, month?: number): Promise<CalendarResponse> => {
        const params: Record<string, number> = {};
        if (year !== undefined) params.year = year;
        if (month !== undefined) params.month = month;
        const response = await axiosInstance.get<CalendarResponse>("/streak/me/calendar", {
            params,
        });
        return response.data;
    },
};
