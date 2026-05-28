export interface StreakResponse {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    lastActivityDate: string | null;
    checkedInToday: boolean;
}

export interface CheckInResponse {
    streak: StreakResponse;
    newCheckIn: boolean;
}

export interface CalendarResponse {
    year: number;
    month: number;
    activeDates: string[];
}
