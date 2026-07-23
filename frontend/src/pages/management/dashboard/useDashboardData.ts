import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";

import { dashboardApi } from "@/api/features/dashboard.api";
import { profileApi } from "@/api/features/profile.api";
import { rewardApi } from "@/api/features/reward.api";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { usePermissions } from "@/hooks/usePermissions";
import { useMyStreak, useStreakCalendar } from "@/hooks/useStreak";
import type {
    Achievement,
    Mission,
    SakuraDashboardProps,
} from "@/components/sakura-dashboard/sakura-dashboard.types";
import type { RootState } from "@/store/store";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Local YYYY-MM-DD key (matches the backend's activeDates day keys). */
function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
    ).padStart(2, "0")}`;
}

/** Monday 00:00 of the week containing `d`. */
function mondayOf(d: Date): Date {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
    return out;
}

/**
 * Assembles every number the Sakura dashboard renders from the real APIs:
 *
 *   - streak (/streak/me + /streak/me/calendar)  → hero day count, weekly
 *     consistency mission, donut
 *   - rewards (/rewards/me)                       → EXP-per-day chart, level
 *     progress
 *   - leaderboard (/leaderboard)                  → ranking stat
 *   - dashboard stats (/dashboard/stats)          → admin mission (USER_READ)
 *
 * Missions are role-aware: learners get a level-up card, admins get a
 * user-management card — both drawn from live data.
 */
export function useDashboardData(): SakuraDashboardProps {
    const { firstName, lastName, email, isAuthenticated } = useSelector(
        (s: RootState) => s.auth,
    );
    const { hasPermission } = usePermissions();
    const isAdmin = hasPermission("USER_READ");

    const today = useMemo(() => new Date(), []);
    const weekStart = useMemo(() => mondayOf(today), [today]);

    // Every source below is a personal, authenticated endpoint. Gate them on
    // the auth flag so a GUEST rendering a page that reuses this hook (e.g. the
    // dictionary side panel) never fires a 401 → /auth/refresh. For guests the
    // hook simply returns zeros/empties.
    const { data: streak } = useMyStreak(isAuthenticated);

    // The current week can straddle two months — fetch both calendars then.
    const { data: calCurrent } = useStreakCalendar(
        today.getFullYear(),
        today.getMonth() + 1,
        isAuthenticated,
    );
    const weekSpansPrevMonth = weekStart.getMonth() !== today.getMonth();
    const { data: calPrev } = useStreakCalendar(
        weekStart.getFullYear(),
        weekStart.getMonth() + 1,
        weekSpansPrevMonth && isAuthenticated,
    );

    const { data: reward } = useQuery({
        queryKey: ["rewards", "me"],
        queryFn: rewardApi.getMe,
        enabled: isAuthenticated,
        staleTime: 60 * 1000,
    });

    const { data: profile } = useQuery({
        queryKey: ["profile", "me"],
        queryFn: profileApi.getProfile,
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000,
    });
    const { data: leaderboard = [] } = useLeaderboard(50, "current");

    const { data: adminStats } = useQuery({
        queryKey: ["dashboard", "stats"],
        queryFn: dashboardApi.getStats,
        enabled: isAdmin && isAuthenticated,
        staleTime: 60 * 1000,
    });

    return useMemo(() => {
        const name =
            [firstName, lastName].filter(Boolean).join(" ").trim() ||
            email?.split("@")[0] ||
            "bạn";

        // ── Weekly consistency (Mon → today) ────────────────────────────
        const activeDates = new Set([
            ...(calCurrent?.activeDates ?? []),
            ...(calPrev?.activeDates ?? []),
        ]);
        let activeThisWeek = 0;
        for (
            let d = new Date(weekStart);
            d <= today;
            d.setDate(d.getDate() + 1)
        ) {
            if (activeDates.has(dayKey(d))) activeThisWeek++;
        }

        // ── EXP per weekday (current week) ───────────────────────────────
        const expPerDay = Array(7).fill(0) as number[];
        for (const log of reward?.history ?? []) {
            if (!log.createdAt) continue;
            const at = new Date(log.createdAt);
            if (Number.isNaN(at.getTime())) continue;
            const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
            if (day < weekStart || day > today) continue;
            expPerDay[(at.getDay() + 6) % 7] += log.expGranted ?? 0;
        }
        const maxExp = Math.max(...expPerDay);
        const todayIdx = (today.getDay() + 6) % 7;
        const peakIndex =
            maxExp > 0 ? expPerDay.indexOf(maxExp) : todayIdx;
        const achievement: Achievement = {
            rangeLabel: "tuần này",
            peakIndex,
            points: WEEKDAY_LABELS.map((label, i) => ({
                label,
                value: maxExp > 0 ? Math.round((expPerDay[i] / maxExp) * 100) : 0,
                raw: expPerDay[i],
            })),
        };

        // ── Level progress ───────────────────────────────────────────────
        const exp = reward?.exp ?? 0;
        const expToNext = reward?.expToNext ?? 0;
        const levelTotal = exp + expToNext;
        const progressPct =
            expToNext > 0
                ? Math.min(99, Math.round((exp / Math.max(1, levelTotal)) * 100))
                : levelTotal > 0
                  ? 100
                  : 0;

        // ── Ranking ──────────────────────────────────────────────────────
        const myEntry = profile
            ? leaderboard.find((e) => e.userId === profile.id)
            : undefined;
        const ranking = myEntry ? `#${myEntry.rank}` : "—";

        // ── Missions (role-aware) ────────────────────────────────────────
        const checkedIn = streak?.checkedInToday ?? false;
        const missions: Mission[] = [
            {
                id: "daily-checkin",
                className: "Hằng ngày",
                title: "ĐIỂM DANH",
                description:
                    "Ghé Hanabun mỗi ngày để giữ chuỗi streak của bạn cháy mãi.",
                kind: "điểm danh",
                status: checkedIn ? "completed" : "in-progress",
                accent: "mint",
                done: checkedIn ? 1 : 0,
                total: 1,
                to: "/daily-checkin",
            },
            {
                id: "weekly-consistency",
                className: "Tuần này",
                title: "HỌC ĐỀU 7 NGÀY",
                description:
                    "Duy trì thói quen — mỗi ngày ghé học một chút là đủ.",
                kind: "chuỗi ngày",
                status: activeThisWeek >= 7 ? "completed" : "in-progress",
                accent: "sakura",
                done: activeThisWeek,
                total: 7,
                to: "/weekly-streak",
            },
            isAdmin && adminStats
                ? {
                      id: "admin-users",
                      className: "Quản trị",
                      title: "NGƯỜI DÙNG HOẠT ĐỘNG",
                      description:
                          "Theo dõi, phân quyền và quản lý người dùng hệ thống.",
                      kind: "hệ thống",
                      status: "challenge",
                      accent: "honey",
                      done: adminStats.activeUsers,
                      total: Math.max(adminStats.totalUsers, 1),
                      to: "/users",
                  }
                : {
                      id: "level-up",
                      className: "Cấp độ",
                      title: `LEVEL ${reward?.level ?? 1}`,
                      description:
                          "Tích luỹ EXP từ việc học để mở khoá cấp độ tiếp theo.",
                      kind: "EXP",
                      status: "challenge",
                      accent: "honey",
                      done: exp,
                      total: Math.max(levelTotal, 1),
                      to: "/level",
                  },
        ];

        return {
            user: {
                name,
                studyDay: Math.max(1, streak?.totalActiveDays ?? 1),
            },
            heroIllustrationUrl: "/hanabun-girl.png",
            missions,
            achievement,
            stats: {
                ranking,
                progressPct,
                donutPct: Math.round((activeThisWeek / 7) * 100),
                donutCaption: `${activeThisWeek}/7 ngày học tuần này`,
            },
        };
    }, [
        firstName,
        lastName,
        email,
        calCurrent,
        calPrev,
        reward,
        profile,
        leaderboard,
        adminStats,
        streak,
        weekStart,
        today,
        isAdmin,
        hasPermission,
    ]);
}
