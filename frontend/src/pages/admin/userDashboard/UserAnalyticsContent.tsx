import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useUserAnalytics } from "@/hooks/useUserAnalytics";

import { GrowthChart } from "./components/GrowthChart";
import { RecentUsersList } from "./components/RecentUsersList";
import { RoleDistributionChart } from "./components/RoleDistributionChart";
import { SummaryCards } from "./components/SummaryCards";
import { TopStreaksList } from "./components/TopStreaksList";

/**
 * User analytics dashboard content — summary cards + charts + recent +
 * top streaks. Rendered both as a stand-alone page (legacy
 * `/admin/users-dashboard` route) and as the "Analytic" tab inside the
 * new `/users` page. Layout wrapper (MainLayout / Tabs) is the caller's
 * responsibility so the same content slots into either context.
 */
export function UserAnalyticsContent() {
    const [growthDays, setGrowthDays] = useState(30);
    const { data, isLoading } = useUserAnalytics(growthDays);

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <SummaryCards summary={data.summary} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <GrowthChart
                        data={data.growth}
                        days={growthDays}
                        onDaysChange={setGrowthDays}
                    />
                </div>
                <RoleDistributionChart data={data.roleDistribution} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentUsersList users={data.recentUsers} />
                <TopStreaksList users={data.topStreaks} />
            </div>
        </div>
    );
}
