import { useMemo } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

import { useStreakCalendar } from "@/hooks/useStreak";
import type { RootState } from "@/store/store";
import { Card, PageHeader, StatTile, sk } from "./engagement-ui";

const LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function mondayOf(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

/**
 * HỌC ĐỀU 7 NGÀY — weekly-consistency feature reached from the "Tuần này"
 * mission card. Shows which of the current week's 7 days are active, a
 * progress bar, and encouragement toward the full-week goal.
 */
export default function WeeklyStreakPage() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => mondayOf(today), [today]);

  const { data: calCurrent } = useStreakCalendar(
    today.getFullYear(),
    today.getMonth() + 1,
    isAuthenticated,
  );
  const spansPrev = weekStart.getMonth() !== today.getMonth();
  const { data: calPrev } = useStreakCalendar(
    weekStart.getFullYear(),
    weekStart.getMonth() + 1,
    spansPrev && isAuthenticated,
  );

  const activeSet = useMemo(() => {
    const s = new Set<string>();
    (calCurrent?.activeDates ?? []).forEach((d) => s.add(d));
    (calPrev?.activeDates ?? []).forEach((d) => s.add(d));
    return s;
  }, [calCurrent, calPrev]);

  const week = useMemo(() => {
    const todayKey = dayKey(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = dayKey(d);
      return {
        label: LABELS[i],
        date: d.getDate(),
        active: activeSet.has(key),
        isToday: key === todayKey,
      };
    });
  }, [weekStart, activeSet, today]);

  const done = week.filter((d) => d.active).length;
  const pct = Math.round((done / 7) * 100);
  const complete = done >= 7;

  return (
    <div className="mx-auto max-w-[900px] p-1">
      <PageHeader
        eyebrow="Tuần này"
        title="Học đều 7 ngày"
        subtitle="Duy trì thói quen — mỗi ngày ghé học một chút là đủ. Hoàn thành đủ 7 ngày trong tuần để nhận thưởng chuỗi."
        accent={sk.pinkDeep}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile value={`${done}/7`} label="Ngày đã học tuần này" color={sk.pinkDeep} />
        <StatTile value={`${pct}%`} label="Tiến độ mục tiêu tuần" color={sk.honeyDeep} />
        <StatTile value={7 - done} label="Ngày còn lại để hoàn thành" color={sk.mintDeep} />
      </div>

      <Card className="mb-6">
        <h3 className="font-display m-0 mb-4 text-[18px] font-bold text-[#3A2E33]">
          Tuần này của bạn
        </h3>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {week.map((d) => (
            <div
              key={d.label}
              className="flex flex-col items-center gap-2 rounded-2xl p-2 py-3 transition-colors"
              style={{
                background: d.active ? sk.pinkWash : "#F7F4F5",
                outline: d.isToday ? `2px solid ${sk.pinkDeep}` : "none",
                outlineOffset: -2,
              }}
            >
              <span className="text-[12px] font-bold text-[#9A8E92]">{d.label}</span>
              {d.active ? (
                <CheckCircle2 className="h-7 w-7" style={{ color: sk.pinkDeep }} />
              ) : (
                <Circle className="h-7 w-7 text-[#D8CDD1]" />
              )}
              <span className="text-[12px] font-semibold text-[#3A2E33]">{d.date}</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-[#9A8E92]">
            <span>Tiến độ</span>
            <span>{done}/7</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#F3E7EC]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${sk.pink}, ${sk.pinkDeep})`,
              }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
            style={{ background: complete ? sk.mintWash : sk.honeyWash }}
          >
            <Sparkles
              className="h-6 w-6"
              style={{ color: complete ? sk.mintDeep : sk.honeyDeep }}
            />
          </div>
          <div>
            <h4 className="font-display m-0 text-[16px] font-bold text-[#3A2E33]">
              {complete ? "Hoàn thành mục tiêu tuần! 🌸" : "Cố lên nào!"}
            </h4>
            <p className="m-0 mt-0.5 text-[13.5px] text-[#9A8E92]">
              {complete
                ? "Bạn đã học đủ cả 7 ngày trong tuần này. Thật đáng ngưỡng mộ!"
                : `Bạn còn ${7 - done} ngày nữa để hoàn thành thử thách tuần này.`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
