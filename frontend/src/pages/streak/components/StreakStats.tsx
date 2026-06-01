import { Calendar, Flame, Target, Trophy } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import type { StreakResponse } from "@/types/features/streak";

interface Props {
    streak: StreakResponse;
}

export function StreakStats({ streak }: Props) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon={<Flame size={20} />}
                label="Chuỗi hiện tại"
                value={`${streak.currentStreak}`}
                suffix="ngày"
                accent={streak.currentStreak > 0}
            />
            <StatCard
                icon={<Trophy size={20} />}
                label="Chuỗi dài nhất"
                value={`${streak.longestStreak}`}
                suffix="ngày"
            />
            <StatCard
                icon={<Target size={20} />}
                label="Tổng ngày hoạt động"
                value={`${streak.totalActiveDays}`}
                suffix="ngày"
            />
            <StatCard
                icon={<Calendar size={20} />}
                label="Lần cuối"
                value={
                    streak.lastActivityDate
                        ? format(new Date(streak.lastActivityDate), "dd/MM/yyyy")
                        : "—"
                }
            />
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    suffix,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    suffix?: string;
    accent?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            accent
                                ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                : "bg-primary/10 text-primary"
                        }`}
                    >
                        {icon}
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                    </p>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span
                        className={`text-3xl font-bold ${
                            accent
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-foreground"
                        }`}
                    >
                        {value}
                    </span>
                    {suffix && (
                        <span className="text-sm text-muted-foreground">{suffix}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
