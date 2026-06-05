import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayBucket } from "../hooks/useKanjiDashboard";

/**
 * Forecast — how many SRS reviews come due each day over the next week.
 * Today's bar is highlighted in the accent colour like Bunpro's forecast.
 */
export function KanjiForecastChart({ data }: { data: DayBucket[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock size={18} className="text-rose-500" />
          Dự báo ôn tập
        </CardTitle>
        <span className="text-xs text-muted-foreground">{total} lượt / 7 ngày</span>
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <EmptyChart label="Chưa có lịch ôn tập nào sắp tới." />
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={4}
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
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(value) => [`${value ?? 0}`, "Cần ôn"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.map((d, i) => (
                    <Cell key={d.date} fill={i === 0 ? "#f43f5e" : "#fb7185"} fillOpacity={i === 0 ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-60 w-full grid place-items-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
