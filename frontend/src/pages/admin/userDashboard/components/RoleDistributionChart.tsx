import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoLabel } from "@/components/common/InfoLabel";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { RoleDistribution } from "@/types/features/dashboard";

interface Props {
    data: RoleDistribution[];
}

// OKLCH-friendly palette that contrasts well with both light and dark themes
const PALETTE = [
    "var(--primary)",
    "oklch(0.65 0.18 145)",   // emerald
    "oklch(0.62 0.18 240)",   // blue
    "oklch(0.70 0.18 320)",   // violet
    "oklch(0.72 0.18 80)",    // amber
    "oklch(0.65 0.20 25)",    // rose
];

export function RoleDistributionChart({ data }: Props) {
    const total = data.reduce((sum, d) => sum + d.count, 0);

    const chartData = data.map((d, i) => ({
        name: d.role === "NO_ROLE" ? "Chưa gán role" : formatRoleLabel(d.role),
        value: d.count,
        color: PALETTE[i % PALETTE.length],
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    <InfoLabel
                        title="Phân bố theo vai trò"
                        info={`${total.toLocaleString()} người dùng phân theo ${data.length} nhóm`}
                    />
                </CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                        Không có dữ liệu
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-6 items-center">
                        <div className="h-44 mx-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={48}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        stroke="var(--background)"
                                        strokeWidth={2}
                                    >
                                        {chartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--popover)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                            color: "var(--foreground)",
                                            fontSize: "12px",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <ul className="space-y-2">
                            {chartData.map((d) => {
                                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                                return (
                                    <li key={d.name} className="flex items-center gap-2.5 text-sm">
                                        <span
                                            className="h-3 w-3 rounded-sm shrink-0"
                                            style={{ backgroundColor: d.color }}
                                        />
                                        <span className="text-foreground truncate flex-1">{d.name}</span>
                                        <span className="text-muted-foreground tabular-nums">
                                            {d.value.toLocaleString()}
                                        </span>
                                        <span className="text-muted-foreground text-xs tabular-nums w-10 text-right">
                                            {pct}%
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
