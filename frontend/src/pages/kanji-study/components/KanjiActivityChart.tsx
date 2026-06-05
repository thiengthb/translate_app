import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayBucket } from "../hooks/useKanjiDashboard";
import { EmptyChart } from "./KanjiForecastChart";

/**
 * Activity — kanji studied per day over the past two weeks
 * (bucketed by each item's lastStudiedAt).
 */
export function KanjiActivityChart({ data }: { data: DayBucket[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity size={18} className="text-rose-500" />
          Hoạt động
        </CardTitle>
        <span className="text-xs text-muted-foreground">{total} lượt / 14 ngày</span>
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <EmptyChart label="Chưa có hoạt động học nào gần đây." />
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kanjiActivityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
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
                  formatter={(value) => [`${value ?? 0}`, "Đã học"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#kanjiActivityFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
