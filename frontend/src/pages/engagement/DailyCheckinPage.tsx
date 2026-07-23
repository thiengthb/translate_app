import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { CheckCircle2, Flame, CalendarDays, Trophy } from "lucide-react";

import { streakApi } from "@/api/features/streak.api";
import { useMyStreak, useStreakCalendar } from "@/hooks/useStreak";
import type { RootState } from "@/store/store";
import { Card, PageHeader, StatTile, sk } from "./engagement-ui";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * ĐIỂM DANH — daily check-in feature reached from the "Hằng ngày" mission
 * card. Shows the live streak (current/longest/total), a check-in action, and
 * a month calendar highlighting every active day.
 */
export default function DailyCheckinPage() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const queryClient = useQueryClient();
  const { data: streak } = useMyStreak(isAuthenticated);

  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const { data: calendar } = useStreakCalendar(year, month, isAuthenticated);
  const activeSet = useMemo(
    () => new Set(calendar?.activeDates ?? []),
    [calendar],
  );

  const checkedIn = streak?.checkedInToday ?? false;

  const checkIn = useMutation({
    mutationFn: streakApi.checkIn,
    onSuccess: (res) => {
      queryClient.setQueryData(["streak", "me"], res.streak);
      void queryClient.invalidateQueries({ queryKey: ["streak", "calendar"] });
    },
  });

  // Month grid — leading blanks so the 1st lands under its weekday.
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mx-auto max-w-[900px] p-1">
      <PageHeader
        eyebrow="Hằng ngày"
        title="Điểm danh"
        subtitle="Ghé Hanabun mỗi ngày để giữ chuỗi streak của bạn cháy mãi. Điểm danh đều đặn để không bỏ lỡ phần thưởng."
        accent={sk.mintDeep}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          value={
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-7 w-7" style={{ color: sk.pink }} />
              {streak?.currentStreak ?? 0}
            </span>
          }
          label="Chuỗi hiện tại (ngày)"
          color={sk.pinkDeep}
        />
        <StatTile
          value={streak?.longestStreak ?? 0}
          label="Chuỗi dài nhất"
          color={sk.honeyDeep}
        />
        <StatTile
          value={streak?.totalActiveDays ?? 0}
          label="Tổng ngày đã học"
          color={sk.mintDeep}
        />
      </div>

      <Card className="mb-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: checkedIn ? sk.mintWash : sk.pinkWash }}
          >
            {checkedIn ? (
              <CheckCircle2 className="h-9 w-9" style={{ color: sk.mintDeep }} />
            ) : (
              <CalendarDays className="h-9 w-9" style={{ color: sk.pinkDeep }} />
            )}
          </div>
          <div>
            <h3 className="font-display m-0 text-[20px] font-bold text-[#3A2E33]">
              {checkedIn ? "Bạn đã điểm danh hôm nay 🎉" : "Chưa điểm danh hôm nay"}
            </h3>
            <p className="m-0 mt-1 text-[14px] text-[#9A8E92]">
              {checkedIn
                ? "Tuyệt vời! Hãy quay lại vào ngày mai để nối dài chuỗi."
                : "Nhấn nút bên dưới để giữ chuỗi streak của bạn."}
            </p>
          </div>
          <button
            type="button"
            disabled={checkedIn || checkIn.isPending || !isAuthenticated}
            onClick={() => checkIn.mutate()}
            className="rounded-full px-7 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(255,107,157,0.35)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            style={{ background: `linear-gradient(120deg, ${sk.pink}, ${sk.pinkDeep})` }}
          >
            {checkIn.isPending
              ? "Đang điểm danh…"
              : checkedIn
                ? "Đã điểm danh"
                : "Điểm danh ngay"}
          </button>
          {!isAuthenticated && (
            <p className="m-0 text-[12px] text-[#B9AEB2]">
              Đăng nhập để điểm danh và tích luỹ chuỗi streak.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: sk.honeyDeep }} />
          <h3 className="font-display m-0 text-[18px] font-bold text-[#3A2E33]">
            Lịch điểm danh tháng {month}/{year}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="pb-1 text-center text-[11px] font-bold text-[#B9AEB2]"
            >
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const active = activeSet.has(dayKey(year, month, d));
            const isToday = d === today.getDate();
            return (
              <div
                key={d}
                className="flex aspect-square items-center justify-center rounded-xl text-[13px] font-semibold transition-colors"
                style={{
                  background: active ? sk.mint : "#F7F4F5",
                  color: active ? "#fff" : sk.muted,
                  outline: isToday ? `2px solid ${sk.pinkDeep}` : "none",
                  outlineOffset: -2,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[12px] text-[#9A8E92]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: sk.mint }} /> Đã học
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: "#F7F4F5" }} /> Chưa học
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded"
              style={{ outline: `2px solid ${sk.pinkDeep}`, outlineOffset: -1 }}
            />{" "}
            Hôm nay
          </span>
        </div>
      </Card>
    </div>
  );
}
