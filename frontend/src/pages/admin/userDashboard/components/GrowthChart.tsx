import { useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GrowthPoint } from "@/types/features/dashboard";

interface Props {
    data: GrowthPoint[];
    days: number;
    onDaysChange: (days: number) => void;
}

const RANGE_OPTIONS = [7, 30, 90] as const;

export function GrowthChart({ data, days, onDaysChange }: Props) {
    const chartData = useMemo(
        () =>
            data.map((p) => ({
                date: p.date,
                shortDate: formatShortDate(p.date),
                count: p.count,
            })),
        [data],
    );

    const total = useMemo(() => data.reduce((sum, p) => sum + p.count, 0), [data]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                    <CardTitle className="text-base">Tăng trưởng người dùng</CardTitle>
                    <CardDescription>
                        {total.toLocaleString()} đăng ký mới trong {days} ngày qua
                    </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md">
                    {RANGE_OPTIONS.map((opt) => (
                        <Button
                            key={opt}
                            size="sm"
                            variant={days === opt ? "default" : "ghost"}
                            onClick={() => onDaysChange(opt)}
                            className="h-7 px-2.5 text-xs"
                        >
                            {opt}d
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pt-2">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                            <XAxis
                                dataKey="shortDate"
                                stroke="var(--muted-foreground)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={24}
                            />
                            <YAxis
                                stroke="var(--muted-foreground)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                width={28}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--popover)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                    color: "var(--foreground)",
                                    fontSize: "12px",
                                }}
                                labelStyle={{ color: "var(--muted-foreground)" }}
                                formatter={(value: number) => [`${value}`, "Đăng ký"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                fill="url(#growthFill)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function formatShortDate(iso: string): string {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
}
