import { ArrowDownRight, ArrowUpRight, CalendarPlus, Sparkles, UserCheck, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { UserAnalyticsSummary } from "@/types/features/dashboard";

interface Props {
    summary: UserAnalyticsSummary;
}

export function SummaryCards({ summary }: Props) {
    const activePercent = summary.totalUsers > 0
        ? Math.round((summary.activeUsers / summary.totalUsers) * 100)
        : 0;
    const isGrowthPositive = summary.growthPercent >= 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon={<Users size={20} />}
                label="Tổng người dùng"
                value={summary.totalUsers.toLocaleString()}
                hint={`${summary.activeUsers.toLocaleString()} đang hoạt động`}
            />
            <StatCard
                icon={<UserCheck size={20} />}
                label="Tỷ lệ hoạt động"
                value={`${activePercent}%`}
                hint={`${summary.activeUsers.toLocaleString()} / ${summary.totalUsers.toLocaleString()}`}
                accent="emerald"
            />
            <StatCard
                icon={<CalendarPlus size={20} />}
                label="Đăng ký tháng này"
                value={summary.newUsersThisMonth.toLocaleString()}
                hint={`Tháng trước: ${summary.newUsersLastMonth.toLocaleString()}`}
                accent="primary"
            />
            <StatCard
                icon={<Sparkles size={20} />}
                label="Tăng trưởng MoM"
                value={`${isGrowthPositive ? "+" : ""}${summary.growthPercent}%`}
                hint="So với tháng trước"
                accent={isGrowthPositive ? "emerald" : "rose"}
                trend={
                    <span
                        className={`inline-flex items-center text-xs font-medium ${
                            isGrowthPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                    >
                        {isGrowthPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </span>
                }
            />
        </div>
    );
}

type Accent = "primary" | "emerald" | "rose";

function StatCard({
    icon,
    label,
    value,
    hint,
    accent = "primary",
    trend,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint?: string;
    accent?: Accent;
    trend?: React.ReactNode;
}) {
    const accentClasses: Record<Accent, string> = {
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    };

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
                        {icon}
                    </div>
                    {trend}
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
                {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
            </CardContent>
        </Card>
    );
}
