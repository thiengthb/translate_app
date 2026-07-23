import { forwardRef } from "react";
import { Link } from "react-router-dom";

import { formatRoleLabel } from "@/utils/rbac.utils";
import type { LeaderboardEntry, LeaderboardSort } from "@/types/features/leaderboard";
import { getTier, METRICS } from "../tier";

interface Props {
    entry: LeaderboardEntry;
    activeSort: LeaderboardSort;
    /** Column maxima, for the proportional bar under each stat. */
    maxima: Record<string, number>;
    isMe?: boolean;
}

export const RankRow = forwardRef<HTMLAnchorElement, Props>(function RankRow(
    { entry, activeSort, maxima, isMe },
    ref,
) {
    const tier = getTier(entry.longestStreak);

    return (
        <Link
            ref={ref}
            to={`/users/${entry.userId}`}
            className={`group relative flex items-center gap-3 px-4 py-2.5 transition-colors sm:px-6 ${
                isMe ? "bg-[#FFE5EC]/60" : "hover:bg-[#FFF7F9]"
            }`}
        >
            {isMe && <span className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-[#FF6B9D]" />}

            <div className="w-7 shrink-0 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FBEAF0] text-xs font-bold tabular-nums text-[#3A2E33]">
                    {entry.rank}
                </span>
            </div>

            <Avatar name={entry.fullName} avatarUrl={entry.avatarUrl} />

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#3A2E33]">
                    {entry.fullName}
                    {isMe && <span className="ml-1.5 text-[10px] font-bold text-[#FF6B9D]">(Bạn)</span>}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                    {entry.roles.slice(0, 2).map((r) => (
                        <span key={r} className="text-[10px] font-medium text-[#B9AEB2]">
                            {formatRoleLabel(r)}
                        </span>
                    ))}
                </div>
            </div>

            {METRICS.map((m, i) => {
                const on = m.key === activeSort;
                const value = entry[m.field];
                const max = maxima[m.key] || 1;
                // Hide the two secondary metrics on narrow screens; the active
                // one is always shown so the sort stays legible.
                const hide = i > 0 && !on;
                return (
                    <div
                        key={m.key}
                        className={`w-14 shrink-0 text-right ${hide ? "hidden sm:block" : ""}`}
                    >
                        <div className="flex items-center justify-end gap-1">
                            {on && <span className="text-[11px] leading-none">{m.icon}</span>}
                            <span
                                className="font-display text-sm font-bold leading-none tabular-nums"
                                style={{ color: on ? m.accent : "#6E6167" }}
                            >
                                {value}
                            </span>
                        </div>
                        <div className="mt-1 ml-auto h-[3px] w-10 overflow-hidden rounded-full bg-[#F3EAEE]">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.round((value / max) * 100)}%`,
                                    background: on ? m.accent : "#E4D6DC",
                                }}
                            />
                        </div>
                    </div>
                );
            })}

            <div className="w-[6.5rem] shrink-0 text-right">
                <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold"
                    style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}
                >
                    <span className="text-[11px] leading-none">{tier.emoji}</span>
                    <span className="hidden sm:inline">{tier.label}</span>
                </span>
            </div>
        </Link>
    );
});

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
    const initials = name
        .split(" ")
        .map((p) => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[#FBEAF0]" />;
    }
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFE5EC] text-xs font-semibold text-[#FF6B9D]">
            {initials || "?"}
        </div>
    );
}
