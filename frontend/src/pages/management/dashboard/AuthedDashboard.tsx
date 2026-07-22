import { MainLayout } from "@/components/layout/MainLayout";
import { SakuraDashboardContent, SakuraDashboardSidePanel } from "@/components/sakura-dashboard/SakuraStudyDashboard";

import { useDashboardData } from "./useDashboardData";

/**
 * The full live Sakura study dashboard for authenticated users — fed entirely
 * by real APIs (streak/check-in, weekly consistency, EXP rewards, leaderboard
 * rank, and — for admins — system user stats). See {@link useDashboardData}.
 *
 * Split out from the `/dashboard` page component so `useDashboardData` (a stack
 * of authenticated queries) only mounts for logged-in users — guests render the
 * teaser instead, without firing any of those requests.
 */
export function AuthedDashboard() {
    const data = useDashboardData();

    return (
        <MainLayout
            pathName={{ "/dashboard": "Dashboard" }}
            pageScroll
            headerExtra={
                <h1 className="font-display m-0 text-[26px] font-bold text-[#3A2E33]">
                    Chào {data.user.name}!
                </h1>
            }
            sidePanel={<SakuraDashboardSidePanel {...data} />}
        >
            <SakuraDashboardContent {...data} />
        </MainLayout>
    );
}
