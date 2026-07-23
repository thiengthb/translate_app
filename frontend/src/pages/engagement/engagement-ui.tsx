import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Shared sakura-styled chrome for the three engagement feature pages
 * (Điểm danh / Học đều 7 ngày / Cấp độ), reached from the dashboard mission
 * cards. Palette mirrors SakuraStudyDashboard so the pages feel native.
 */
export const sk = {
  ink: "#3A2E33",
  muted: "#9A8E92",
  hairline: "#FBEAF0",
  pink: "#FF8FAB",
  pinkDeep: "#FF6B9D",
  pinkWash: "#FFE5EC",
  mint: "#9BE3C9",
  mintDeep: "#5FB593",
  mintWash: "#EAFBF3",
  honey: "#FFC95C",
  honeyDeep: "#E0A02E",
  honeyWash: "#FFF6E2",
} as const;

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  accent,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="mb-6">
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9A8E92] transition-colors hover:text-[#FF6B9D]"
      >
        <ArrowLeft className="h-4 w-4" />
        Về bảng điều khiển
      </Link>
      <span
        className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
        style={{ color: accent, background: `${accent}22` }}
      >
        {eyebrow}
      </span>
      <h1 className="font-display m-0 mb-1.5 mt-3 text-[30px] font-extrabold tracking-[0.5px] text-[#3A2E33] sm:text-[36px]">
        {title}
      </h1>
      <p className="m-0 max-w-[560px] text-[15px] leading-relaxed text-[#9A8E92]">
        {subtitle}
      </p>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[22px] border border-[#FBEAF0] bg-white p-6 shadow-[0_8px_24px_rgba(255,143,171,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({
  value,
  label,
  color,
}: {
  value: ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#FBEAF0] bg-white p-5 text-center shadow-[0_4px_12px_rgba(58,46,51,0.05)]">
      <div className="font-display text-[34px] font-extrabold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium text-[#9A8E92]">{label}</div>
    </div>
  );
}
