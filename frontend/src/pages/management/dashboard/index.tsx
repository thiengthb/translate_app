import { MainLayout } from "@/components/layout/MainLayout";
import { SakuraDashboardContent, SakuraDashboardSidePanel } from "@/components/sakura-dashboard/SakuraStudyDashboard";

import { useDashboardData } from "./useDashboardData";

/**
 * Home dashboard for every role — the Sakura study dashboard rendered inside
 * the app shell (candy rail + top bar), fed entirely by live data:
 * streak/check-in, weekly consistency, EXP rewards, leaderboard rank, and —
 * for admins — system user stats. See {@link useDashboardData}.
 */
export function Dashboard() {
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
