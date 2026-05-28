import { useState } from "react";
import { Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { useUserAnalytics } from "@/hooks/useUserAnalytics";

import { GrowthChart } from "./components/GrowthChart";
import { RecentUsersList } from "./components/RecentUsersList";
import { RoleDistributionChart } from "./components/RoleDistributionChart";
import { SummaryCards } from "./components/SummaryCards";
import { TopStreaksList } from "./components/TopStreaksList";

export default function UserDashboardPage() {
    const [growthDays, setGrowthDays] = useState(30);
    const { data, isLoading } = useUserAnalytics(growthDays);

    if (isLoading || !data) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="w-full max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Người dùng</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tổng quan về tài khoản, phân quyền và mức độ tương tác.
                    </p>
                </div>

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
        </MainLayout>
    );
}
