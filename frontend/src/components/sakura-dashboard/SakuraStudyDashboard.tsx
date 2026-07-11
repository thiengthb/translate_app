// ─────────────────────────────────────────────────────────────────────────────
// Sakura Study Dashboard — in-shell content
//
// Stack: React + TS + Tailwind v4 + shadcn/ui + lucide-react  (matches Hanabun)
// Palette: FIXED sakura candy palette (mirrors the :root vars in index.css).
// Font:    headings use the `font-display` utility ("Baloo 2").
//
// Rendered inside MainLayout by the /dashboard page. All numbers are live —
// streak, reward EXP, leaderboard rank — assembled by useDashboardData.
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";

import {
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Medal,
  Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAutoCheckIn, useMyStreak, useStreakCalendar } from "@/hooks/useStreak";

import type {
  Achievement,
  Mission,
  MissionAccent,
  SakuraDashboardProps,
} from "./sakura-dashboard.types";

// ── Fixed palette ────────────────────────────────────────────────────────────
const sakura = {
  bg: "#FFF7F9",
  ink: "#3A2E33",
  muted: "#9A8E92",
  faint: "#B9AEB2",
  hairline: "#FBEAF0",
  pink: "#FF8FAB",
  pinkDeep: "#FF6B9D",
  pinkSoft: "#FFC2D4",
  pinkWash: "#FFE5EC",
  mint: "#9BE3C9",
  mintDeep: "#5FB593",
  mintWash: "#EAFBF3",
  mintBorder: "#BDEBD8",
  honey: "#FFC95C",
  honeyDeep: "#E0A02E",
  honeyWash: "#FFF6E2",
  honeyBorder: "#FFE2A8",
} as const;

const accentMap: Record<
  MissionAccent,
  {
    cardBg: string;
    cardBorder: string;
    chevron: string;
    pillText: string;
    pillBg: string;
    barTrack: string;
    barFill: string;
    badgeBorder: string;
    badgeText: string;
    badgeLabel: string;
  }
> = {
  mint: {
    cardBg: sakura.mintWash,
    cardBorder: sakura.mintBorder,
    chevron: sakura.mintDeep,
    pillText: sakura.mintDeep,
    pillBg: sakura.mintWash,
    barTrack: sakura.mintWash,
    barFill: sakura.mint,
    badgeBorder: sakura.mint,
    badgeText: sakura.mintDeep,
    badgeLabel: "Completed",
  },
  sakura: {
    cardBg: sakura.pinkWash,
    cardBorder: sakura.pink,
    chevron: sakura.pink,
    pillText: sakura.pinkDeep,
    pillBg: sakura.pinkWash,
    barTrack: sakura.pinkWash,
    barFill: `linear-gradient(90deg, ${sakura.pink}, ${sakura.pinkDeep})`,
    badgeBorder: sakura.honey,
    badgeText: sakura.honeyDeep,
    badgeLabel: "in progress",
  },
  honey: {
    cardBg: sakura.honeyWash,
    cardBorder: sakura.honeyBorder,
    chevron: sakura.honeyDeep,
    pillText: sakura.honeyDeep,
    pillBg: sakura.honeyWash,
    barTrack: sakura.honeyWash,
    barFill: sakura.honey,
    badgeBorder: sakura.honey,
    badgeText: sakura.honeyDeep,
    badgeLabel: "challenge",
  },
};

// ── Small building blocks ─────────────────────────────────────────────────────
function MissionCard({ mission }: { mission: Mission }) {
  const navigate = useNavigate();
  const a = accentMap[mission.accent];
  const pct =
    mission.total > 0
      ? Math.min(100, Math.round((mission.done / mission.total) * 100))
      : 0;
  const completed = mission.status === "completed";
  const showBadge = completed || mission.status === "in-progress";
  const badgeLabel = completed ? "Completed" : "in progress";

  return (
    <div
      role={mission.to ? "link" : undefined}
      tabIndex={mission.to ? 0 : undefined}
      onClick={mission.to ? () => navigate(mission.to!) : undefined}
      onKeyDown={
        mission.to
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") navigate(mission.to!);
            }
          : undefined
      }
      className={cn(
        "min-w-0 flex-1 rounded-[22px] p-4 pb-[18px]",
        mission.to &&
          "cursor-pointer transition-transform hover:-translate-y-0.5",
      )}
      style={{ background: a.cardBg, border: `1.5px solid ${a.cardBorder}` }}
    >
      <div className="mb-[14px] flex items-center justify-between">
        <span className="font-display text-[18px] font-bold text-[#3A2E33]">
          {mission.className}
        </span>
        <ChevronRight className="h-[18px] w-[18px]" style={{ color: a.chevron }} />
      </div>

      <div className="relative rounded-2xl bg-white p-4 pb-[14px] shadow-[0_4px_12px_rgba(58,46,51,0.06)]">
        <span
          className="inline-block rounded-full px-[10px] py-[3px] text-[11px] font-bold tracking-[0.04em]"
          style={{ color: a.pillText, background: a.pillBg }}
        >
          {mission.kind}
        </span>

        {showBadge && (
          <div
            className="absolute right-[14px] top-[14px] flex h-[58px] w-[58px] -rotate-[14deg] items-center justify-center rounded-full text-center text-[8.5px] font-bold uppercase leading-tight tracking-[0.03em]"
            style={{
              border: `2px solid ${completed ? sakura.mint : a.badgeBorder}`,
              color: completed ? sakura.mintDeep : a.badgeText,
            }}
          >
            {badgeLabel}
          </div>
        )}

        <h4 className="font-display mb-[6px] mt-3 text-[17px] font-bold tracking-[0.5px]">
          {mission.title}
        </h4>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[#9A8E92]">
          {mission.description}
        </p>

        <MissionIllustration accent={mission.accent} url={mission.illustrationUrl} />

        <div className="mb-[7px] flex items-center justify-end gap-[5px] text-[12px] font-semibold text-[#9A8E92]">
          <ListChecks className="h-[14px] w-[14px]" />
          {mission.done}/{mission.total}
        </div>
        <div
          className="h-[6px] overflow-hidden rounded-full"
          style={{ background: a.barTrack }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: a.barFill }}
          />
        </div>
      </div>
    </div>
  );
}

function MissionIllustration({
  accent,
  url,
}: {
  accent: MissionAccent;
  url?: string;
}) {
  if (url) {
    return (
      <div className="my-[6px] flex h-[74px] items-center justify-center">
        <img src={url} alt="" className="h-full max-w-full object-contain" />
      </div>
    );
  }
  // Decorative fallbacks (swap for real art when available)
  return (
    <div className="my-[6px] flex h-[74px] items-center justify-center">
      {accent === "mint" && (
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
          <ellipse cx="60" cy="56" rx="48" ry="9" fill="#EAFBF3" />
          <rect x="34" y="22" width="40" height="30" rx="5" fill="#FFC2D4" />
          <rect x="42" y="14" width="40" height="30" rx="5" fill="#FFE5EC" stroke="#FF8FAB" strokeWidth="1.5" />
          <circle cx="86" cy="20" r="9" fill="#9BE3C9" />
        </svg>
      )}
      {accent === "sakura" && (
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
          <ellipse cx="60" cy="58" rx="46" ry="8" fill="#FFE5EC" />
          <rect x="40" y="16" width="40" height="34" rx="5" fill="#fff" stroke="#FF8FAB" strokeWidth="1.5" />
          <rect x="52" y="12" width="16" height="7" rx="3" fill="#FFC2D4" />
          <circle cx="86" cy="40" r="8" fill="none" stroke="#FFC95C" strokeWidth="2.5" />
          <line x1="92" y1="46" x2="98" y2="52" stroke="#FFC95C" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {accent === "honey" && (
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
          <ellipse cx="60" cy="58" rx="46" ry="8" fill="#FFF6E2" />
          <rect x="34" y="18" width="22" height="22" rx="6" fill="#FFE5EC" stroke="#FF8FAB" strokeWidth="1.3" />
          <rect x="62" y="16" width="22" height="22" rx="6" fill="#EAFBF3" stroke="#9BE3C9" strokeWidth="1.3" />
          <rect x="44" y="42" width="22" height="20" rx="6" fill="#FFF6E2" stroke="#FFC95C" strokeWidth="1.3" />
        </svg>
      )}
    </div>
  );
}

// ── Record (streak) calendar — live ───────────────────────────────────────────
// Self-contained streak widget: month grid of check-in days plus the headline
// streak stats. Reads the real `/streak` API (current / longest / total active
// days + per-month active dates) and triggers the once-per-day auto check-in so
// landing on the dashboard counts toward today's streak.

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local YYYY-MM-DD key (matches the backend's activeDates day keys). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Monday-first grid of the given month; leading/trailing blanks are null. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dayCellStyle(opts: {
  active: boolean;
  today: boolean;
  future: boolean;
}): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: "50%",
    fontSize: 13.5,
    fontWeight: 600,
  };
  if (opts.today && opts.active)
    return { ...base, background: sakura.pinkDeep, color: "#fff", boxShadow: "0 4px 10px rgba(255,107,157,0.5)" };
  if (opts.today)
    return { ...base, border: `2px solid ${sakura.pink}`, color: sakura.pinkDeep };
  if (opts.active)
    return { ...base, background: sakura.pinkSoft, color: sakura.ink };
  if (opts.future) return { ...base, color: "#D9CDD1", fontWeight: 500 };
  return { ...base, color: sakura.ink };
}

function StreakStat({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-[16px] bg-[#FFF7F9] px-2 py-3">
      <span style={{ color }} className="flex items-center gap-1">
        {icon}
      </span>
      <span className="font-display text-[22px] font-bold leading-none text-[#3A2E33]">
        {value}
      </span>
      <span className="text-center text-[11px] font-medium leading-tight text-[#9A8E92]">
        {label}
      </span>
    </div>
  );
}

function RecordCalendar() {
  useAutoCheckIn();
  const today = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1); // 1-12

  const { data: streak } = useMyStreak();
  const { data: calendarData } = useStreakCalendar(year, month);
  const activeSet = React.useMemo(
    () => new Set(calendarData?.activeDates ?? []),
    [calendarData],
  );
  const cells = React.useMemo(() => monthGrid(year, month), [year, month]);
  const todayKey = dayKey(today);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return; // never browse into the future
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  return (
    <div className="relative mt-[18px]">
      {/* string + washi tape */}
      <div className="absolute inset-x-[30px] top-[-6px] h-[14px] rounded-[50%] border-t-2 border-[#E7D7DD]" />
      <div
        className="absolute left-[52px] top-[-16px] h-[42px] w-[30px] -rotate-[16deg] opacity-90 shadow-[0_3px_6px_rgba(0,0,0,0.06)]"
        style={{
          background: "repeating-linear-gradient(135deg,#FFC2D4 0 6px,#FFD7E1 6px 12px)",
          clipPath: "polygon(0 0,100% 0,100% 82%,50% 100%,0 82%)",
        }}
      />
      <div
        className="absolute right-[56px] top-[-16px] h-[42px] w-[30px] rotate-[14deg] opacity-90 shadow-[0_3px_6px_rgba(0,0,0,0.06)]"
        style={{
          background: "repeating-linear-gradient(135deg,#FFD98C 0 6px,#FFE6B0 6px 12px)",
          clipPath: "polygon(0 0,100% 0,100% 82%,50% 100%,0 82%)",
        }}
      />

      <Card className="rounded-[24px] border-0 bg-white p-0 px-6 py-[22px] pb-6 shadow-[0_12px_30px_rgba(255,143,171,0.14)]">
        <div className="mb-[16px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display m-0 text-[20px] font-bold">Record</h3>
            {streak?.checkedInToday && (
              <span className="rounded-full bg-[#FFE5EC] px-2 py-0.5 text-[11px] font-semibold text-[#FF6B9D]">
                ✓ hôm nay
              </span>
            )}
          </div>
          <div className="flex items-center gap-[14px] text-[14px] font-semibold text-[#3A2E33]">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Tháng trước"
              className="cursor-pointer text-[#B9AEB2] transition-colors hover:text-[#FF8FAB]"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <span className="min-w-[64px] text-center tabular-nums">
              {month}&nbsp;&nbsp;{year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={isCurrentMonth}
              aria-label="Tháng sau"
              className="cursor-pointer text-[#B9AEB2] transition-colors hover:text-[#FF8FAB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Streak headline stats */}
        <div className="mb-[18px] flex items-stretch gap-2">
          <StreakStat
            icon={<Flame className="h-[18px] w-[18px]" />}
            value={streak?.currentStreak ?? 0}
            label="Chuỗi hiện tại"
            color={sakura.pinkDeep}
          />
          <StreakStat
            icon={<Trophy className="h-[18px] w-[18px]" />}
            value={streak?.longestStreak ?? 0}
            label="Chuỗi dài nhất"
            color={sakura.honeyDeep}
          />
          <StreakStat
            icon={<CalendarCheck className="h-[18px] w-[18px]" />}
            value={streak?.totalActiveDays ?? 0}
            label="Tổng ngày học"
            color={sakura.mintDeep}
          />
        </div>

        <div className="grid grid-cols-7 gap-x-[4px] gap-y-[6px] text-center">
          {DOW_LABELS.map((d) => (
            <div key={d} className="pb-[4px] text-[12px] font-semibold text-[#B9AEB2]">
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="h-9" />;
            const key = dayKey(cell);
            const active = activeSet.has(key);
            const isToday = key === todayKey;
            const future = cell > today && !isToday;
            return (
              <div key={i} className="flex h-9 items-center justify-center">
                <span
                  style={dayCellStyle({ active, today: isToday, future })}
                  title={
                    active
                      ? `${cell.getDate()}/${month} — đã học`
                      : `${cell.getDate()}/${month}`
                  }
                >
                  {cell.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-[#9A8E92]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: sakura.pinkSoft }} />
            Đã học
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: sakura.pink }} />
            Hôm nay
          </span>
        </div>
      </Card>
    </div>
  );
}

function AchievementChart({ achievement }: { achievement: Achievement }) {
  const W = 400;
  const H = 170;
  const top = 50;
  const bottom = 150;
  const left = 20;
  const right = 390;
  const pts = achievement.points;

  const xy = pts.map((p, i) => {
    const x = left + ((right - left) * i) / (pts.length - 1);
    const y = bottom - ((bottom - top) * p.value) / 100;
    return { x, y };
  });

  // smooth cubic path through points
  const line = xy
    .map((p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");
  const area = `${line} L ${right} ${bottom} L ${left} ${bottom} Z`;

  const peak = xy[achievement.peakIndex];
  const peakPoint = pts[achievement.peakIndex];
  const peakLabel =
    peakPoint?.raw !== undefined
      ? `${peakPoint.raw} EXP`
      : `${peakPoint?.value ?? 0}%`;
  const peakLeftPct = ((peak.x - left) / (right - left)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display m-0 text-[20px] font-bold">Thành tích</h3>
        <div className="flex items-center gap-[5px] text-[14px] font-semibold text-[#9A8E92]">
          {achievement.rangeLabel}
        </div>
      </div>
      <p className="m-0 mb-[6px] mt-1 text-[13px] text-[#9A8E92]">
        EXP nhận được từng ngày — cố lên nhé~
      </p>

      <div className="relative">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-40">
          <defs>
            <linearGradient id="sakuraArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8FAB" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FF8FAB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#sakuraArea)" />
          <path d={line} fill="none" stroke="#FF8FAB" strokeWidth="3" strokeLinecap="round" />
          <line x1={peak.x} y1={peak.y} x2={peak.x} y2={bottom} stroke="#FFC2D4" strokeWidth="1.5" strokeDasharray="3 4" />
          <circle cx={peak.x} cy={peak.y} r="6" fill="#fff" stroke="#FF6B9D" strokeWidth="3" />
        </svg>
        <div
          className="absolute top-[8px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-[#FFE0E8] bg-white px-[10px] py-[3px] text-[14px] font-bold text-[#FF6B9D] shadow-[0_4px_10px_rgba(255,143,171,0.2)]"
          style={{ left: `${peakLeftPct}%` }}
        >
          {peakLabel}
        </div>
      </div>

      <div className="mt-[2px] grid grid-cols-7 text-center text-[12.5px] text-[#9A8E92]">
        {pts.map((p, i) => (
          <span
            key={p.label}
            className={cn(i === achievement.peakIndex && "font-bold text-[#FF6B9D]")}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DataDonut({ pct, caption }: { pct: number; caption?: string }) {
  const r = 52;
  const C = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * C;
  const pinkLen = filled * 0.62;
  const honeyLen = filled * 0.38;
  return (
    <div className="flex flex-[1.3] flex-col items-center justify-center rounded-[22px] bg-white p-[18px] shadow-[0_8px_22px_rgba(255,143,171,0.12)]">
      <div className="relative h-32 w-32">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#FFE5EC" strokeWidth="13" />
          <circle
            cx="64" cy="64" r={r} fill="none" stroke="#FF8FAB" strokeWidth="13" strokeLinecap="round"
            strokeDasharray={`${pinkLen} ${C - pinkLen}`}
          />
          <circle
            cx="64" cy="64" r={r} fill="none" stroke="#FFC95C" strokeWidth="13" strokeLinecap="round"
            strokeDasharray={`${honeyLen} ${C - honeyLen}`}
            strokeDashoffset={-pinkLen}
          />
        </svg>
        <div className="font-display absolute inset-0 flex items-center justify-center text-[30px] font-bold text-[#3A2E33]">
          {pct}%
        </div>
      </div>
      <p className="m-0 mt-[14px] text-center text-[13px] text-[#9A8E92]">
        {caption ?? "Tỷ lệ học đều tuần này"}
      </p>
    </div>
  );
}

function StatCard({
  value,
  suffix,
  label,
  iconColor,
}: {
  value: React.ReactNode;
  suffix?: string;
  label: string;
  iconColor: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-[18px] border border-[#FBEAF0] bg-white px-4 py-[14px] shadow-[0_4px_12px_rgba(58,46,51,0.04)]">
      <div>
        <div className="font-display text-[26px] font-bold leading-none text-[#3A2E33]">
          {value}
          {suffix && <span className="text-[15px]">{suffix}</span>}
        </div>
        <div className="mt-1 text-[12.5px] text-[#9A8E92]">{label}</div>
      </div>
      <Medal className="h-[22px] w-[22px]" style={{ color: iconColor }} />
    </div>
  );
}

// ── In-shell content ─────────────────────────────────────────────────────────
// The Sakura dashboard WITHOUT its own sidebar / full-screen wrapper, so it
// drops inside the app shell (MainLayout). Used by the /dashboard page.
export function SakuraDashboardContent({
  user,
  heroIllustrationUrl,
  missions,
  achievement,
  stats,
}: SakuraDashboardProps) {
  return (
    <div className="flex flex-col items-start gap-7 font-[Quicksand,sans-serif] text-[#3A2E33] xl:flex-row">
      {/* LEFT: greeting + hero + missions, in a white candy shell */}
      <div className="min-w-0 flex-1 rounded-[32px] bg-white px-6 pb-8 pt-7 shadow-[0_18px_50px_rgba(255,143,171,0.16)] sm:px-9">
        <h1 className="font-display m-0 mb-6 text-[26px] font-bold text-[#3A2E33]">
          Hi! {user.name}, welcome
        </h1>

        {/* Hero */}
        <div
          className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[24px] border border-[#FBEAF0] px-6 py-6 shadow-[0_8px_24px_rgba(255,143,171,0.10)] sm:flex-row sm:px-9"
          style={{ background: "linear-gradient(120deg,#FFF0F4 0%,#FFFFFF 60%)" }}
        >
          <div className="absolute left-[64px] top-[120px] text-[20px] leading-none text-[#FFC95C]">✦</div>
          <div className="absolute right-20 top-[30px] h-2 w-[34px] -rotate-[25deg] rounded-full bg-[#FFE0E8]" />

          <div className="flex w-full max-w-[200px] flex-none items-end justify-center sm:w-[200px]">
            {heroIllustrationUrl ? (
              <img src={heroIllustrationUrl} alt="" className="h-[170px] w-[170px] max-w-full object-contain" />
            ) : (
              <div className="flex h-[170px] w-[170px] items-center justify-center rounded-[20px] bg-[#FFF0F4] text-[13px] text-[#FF8FAB]">
                illustration
              </div>
            )}
          </div>

          <div className="relative z-10 min-w-0 flex-1">
            <h2 className="font-display m-0 mb-[10px] text-[28px] font-semibold uppercase leading-[1.15] tracking-[0.5px] text-[#3A2E33] sm:text-[34px]">
              This is your{" "}
              <span className="font-display align-[-4px] text-[44px] font-extrabold text-[#FF8FAB] sm:text-[54px]">
                {user.studyDay}
              </span>{" "}
              day of study
            </h2>
            <p className="m-0 text-[18px] font-medium text-[#9A8E92]">Go and study</p>
          </div>
        </div>

        {/* Mission header */}
        <div className="my-[18px] mt-[30px] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#FFE5EC] text-[#FF6B9D]">
              <CheckSquare className="h-[19px] w-[19px]" />
            </span>
            <h3 className="font-display m-0 text-[22px] font-bold">Mission</h3>
          </div>
          <CalendarDays className="h-[22px] w-[22px] text-[#B9AEB2]" />
        </div>

        {/* Mission cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      </div>

      {/* RIGHT panel */}
      <div className="flex w-full flex-none flex-col gap-[26px] xl:w-[420px]">
        <RecordCalendar />
        <AchievementChart achievement={achievement} />

        <div>
          <h3 className="font-display m-0 mb-[14px] text-[20px] font-bold">Thống kê</h3>
          <div className="flex items-stretch gap-4">
            <DataDonut pct={stats.donutPct} caption={stats.donutCaption} />
            <div className="flex flex-1 flex-col gap-4">
              <StatCard value={stats.ranking} label="Xếp hạng" iconColor={sakura.pink} />
              <StatCard value={stats.progressPct} suffix="%" label="Tiến độ cấp độ" iconColor={sakura.honey} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SakuraDashboardContent;
