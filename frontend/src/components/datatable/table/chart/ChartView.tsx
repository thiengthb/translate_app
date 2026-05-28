import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatRoleLabel } from "@/utils/rbac.utils";

interface ChartViewProps {
    table: any;
}

type ChartKind = "bar" | "pie";

const PALETTE = [
    "var(--primary)",
    "oklch(0.65 0.18 145)",
    "oklch(0.62 0.18 240)",
    "oklch(0.70 0.18 320)",
    "oklch(0.72 0.18 80)",
    "oklch(0.65 0.20 25)",
    "oklch(0.60 0.15 195)",
    "oklch(0.68 0.16 270)",
];

/**
 * 3rd view mode: pick a categorical field, count rows per category, render
 * as bar or pie. Best for relation / boolean / enum-like columns.
 */
export function ChartView({ table }: ChartViewProps) {
    const { schema } = table;

    // Pick fields that make sense as categories
    const categoryFields = useMemo(
        () =>
            schema.fields.filter(
                (f: any) =>
                    f.type === "relation" ||
                    f.type === "boolean" ||
                    f.type === "string" ||
                    !f.type,
            ),
        [schema.fields],
    );

    const [groupBy, setGroupBy] = useState<string>(
        () => categoryFields[0]?.name ?? "",
    );
    const [kind, setKind] = useState<ChartKind>("bar");

    const groupField = schema.fields.find((f: any) => f.name === groupBy);

    const chartData = useMemo(() => {
        if (!groupField || !table.data) return [];
        const relOptions: any[] = table.relationOptions?.[groupField.name] ?? [];
        const counts = new Map<string, number>();

        for (const row of table.data) {
            const raw = row[groupField.name];
            const label = resolveLabel(raw, groupField, relOptions);
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }

        return Array.from(counts.entries())
            .map(([label, value], i) => ({
                name: label,
                value,
                color: PALETTE[i % PALETTE.length],
            }))
            .sort((a, b) => b.value - a.value);
    }, [groupField, table.data, table.relationOptions]);

    if (categoryFields.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Không có trường phù hợp để vẽ biểu đồ
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                        <CardTitle className="text-base">Biểu đồ phân bố</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {table.data?.length ?? 0} bản ghi trang hiện tại — nhóm theo{" "}
                            <span className="font-medium text-foreground">
                                {groupField?.label}
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Nhóm theo
                            </Label>
                            <Select value={groupBy} onValueChange={setGroupBy}>
                                <SelectTrigger className="h-8 w-40 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryFields.map((f: any) => (
                                        <SelectItem key={f.name} value={f.name}>
                                            {f.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-1 items-end pb-0.5">
                            <Button
                                variant={kind === "bar" ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setKind("bar")}
                                aria-label="Bar chart"
                            >
                                <BarChart3 size={14} />
                            </Button>
                            <Button
                                variant={kind === "pie" ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setKind("pie")}
                                aria-label="Pie chart"
                            >
                                <PieIcon size={14} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {chartData.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                            Không có dữ liệu để hiển thị
                        </div>
                    ) : (
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {kind === "bar" ? (
                                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="var(--muted-foreground)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            interval={0}
                                            angle={-15}
                                            textAnchor="end"
                                            height={50}
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
                                            cursor={{ fill: "var(--accent)" }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            dataKey="value"
                                            nameKey="name"
                                            outerRadius={100}
                                            innerRadius={50}
                                            paddingAngle={2}
                                            stroke="var(--background)"
                                            strokeWidth={2}
                                            label={({ name, percent }: any) =>
                                                `${name} (${Math.round((percent ?? 0) * 100)}%)`
                                            }
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
                                        <Legend
                                            wrapperStyle={{ fontSize: "12px" }}
                                            iconType="circle"
                                        />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function resolveLabel(value: any, field: any, relOptions: any[]): string {
    if (value === null || value === undefined) return "(trống)";

    if (field.type === "boolean") {
        const labels = field.booleanLabels;
        return value ? labels?.true ?? "Có" : labels?.false ?? "Không";
    }

    if (field.type === "relation" && field.relation && relOptions.length > 0) {
        const rel = field.relation;
        const found = relOptions.find(
            (o: any) => String(o[rel.valueField]) === String(value),
        );
        return found ? String(found[rel.labelField]) : String(value);
    }

    if (field.name === "role" || field.name === "roles") {
        if (Array.isArray(value)) return value.map(formatRoleLabel).join(", ");
        return formatRoleLabel(String(value));
    }

    if (Array.isArray(value)) return value.join(", ") || "(trống)";
    return String(value);
}
