import { useSelector } from "react-redux";

import { MainLayout } from "@/components/layout/MainLayout";
import { SakuraDashboardContent } from "@/components/sakura-dashboard/SakuraStudyDashboard";
import { defaultSakuraData } from "@/components/sakura-dashboard/sakura-dashboard.types";
import type { RootState } from "@/store/store";

/**
 * Home dashboard.
 *
 * Renders the Sakura study-dashboard design INSIDE the app shell (the sidebar
 * + top bar come from MainLayout). The greeting uses the logged-in user's
 * name; the hero / missions / calendar / charts use sample data for now —
 * swap `defaultSakuraData` for real study data once the endpoints exist.
 */
export function Dashboard() {
    const { firstName, lastName, email } = useSelector(
        (s: RootState) => s.auth,
    );

    const name =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        email?.split("@")[0] ||
        defaultSakuraData.user.name;

    return (
        <MainLayout pathName={{ "/dashboard": "Dashboard" }}>
            <SakuraDashboardContent
                user={{ ...defaultSakuraData.user, name }}
                missions={defaultSakuraData.missions}
                calendar={defaultSakuraData.calendar}
                achievement={defaultSakuraData.achievement}
                stats={defaultSakuraData.stats}
            />
        </MainLayout>
    );
}
