import { useSelector } from "react-redux";

import { MainLayout } from "@/components/layout/MainLayout";
import { GuestDashboard } from "@/pages/guest/GuestDashboard";
import type { RootState } from "@/store/store";

import { AuthedDashboard } from "./AuthedDashboard";

/**
 * Home dashboard.
 *
 * - Guests (Mazii open access) see the same shell with a teaser layout: the
 *   personal widgets (missions, streak, achievement) are shown blurred behind a
 *   "đăng nhập để…" glass overlay. No authenticated queries fire.
 * - Authenticated users get the full live Sakura study dashboard.
 */
export function Dashboard() {
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

    if (!isAuthenticated) {
        return (
            <MainLayout pathName={{ "/dashboard": "Dashboard" }} pageScroll>
                <GuestDashboard />
            </MainLayout>
        );
    }

    return <AuthedDashboard />;
}
