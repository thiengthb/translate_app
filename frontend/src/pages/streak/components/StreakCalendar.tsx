import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoLabel } from "@/components/common/InfoLabel";
import { Button } from "@/components/ui/button";
import { useStreakCalendar } from "@/hooks/useStreak";

const WEEK_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_LABELS = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export function StreakCalendar() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const { data: calendar, isLoading } = useStreakCalendar(year, month);

    const activeSet = useMemo(
        () => new Set(calendar?.activeDates ?? []),
        [calendar],
    );

    const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

    const prevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear((y) => y - 1);
        } else setMonth((m) => m - 1);
    };
    const nextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear((y) => y + 1);
        } else setMonth((m) => m + 1);
    };

    const isCurrentMonth =
        year === today.getFullYear() && month === today.getMonth() + 1;
    const todayDateStr = formatDateKey(today);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="text-base">
                        <InfoLabel
                            title="Lịch hoạt động"
                            info="Những ngày bạn đã check-in trong tháng"
                        />
                    </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm font-medium min-w-28 text-center">
                        {MONTH_LABELS[month - 1]} {year}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextMonth}
                        disabled={isCurrentMonth}
                        aria-label="Next month"
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    {WEEK_DAYS.map((d) => (
                        <div key={d} className="py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="animate-spin text-muted-foreground" size={24} />
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1.5">
                        {cells.map((cell, i) => {
                            if (!cell) return <div key={i} className="aspect-square" />;
                            const dateStr = formatDateKey(cell);
                            const isActive = activeSet.has(dateStr);
                            const isToday = dateStr === todayDateStr;
                            const isFuture = cell > today;

                            return (
                                <div
                                    key={i}
                                    className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                                        isFuture
                                            ? "bg-muted/30 text-muted-foreground/40"
                                            : isActive
                                                ? "bg-orange-500 text-white shadow-sm hover:bg-orange-600"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    } ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                                    title={`${cell.getDate()}/${cell.getMonth() + 1}/${cell.getFullYear()}${isActive ? " — đã check-in" : ""}`}
                                >
                                    {cell.getDate()}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded bg-orange-500" />
                        Đã hoạt động
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded bg-muted/50" />
                        Không hoạt động
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded ring-2 ring-primary" />
                        Hôm nay
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildMonthGrid(year: number, month: number): (Date | null)[] {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startWeekday = firstDay.getDay(); // 0=Sun … 6=Sat
    const daysInMonth = lastDay.getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(new Date(year, month - 1, d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
