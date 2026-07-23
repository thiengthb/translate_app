import type { CSSProperties } from "react";
import { Crown } from "lucide-react";
import { Link } from "react-router-dom";

import { formatRoleLabel } from "@/utils/rbac.utils";
import type { LeaderboardEntry, LeaderboardSort } from "@/types/features/leaderboard";
import { getTier, METRICS } from "../tier";

interface Props {
    entries: LeaderboardEntry[];
    activeSort: LeaderboardSort;
    /** Highlight the current viewer's own podium card. */
    meId?: number;
}

// Rank accents drawn from the fixed Sakura candy palette (see
// SakuraStudyDashboard.tsx): 1st = honey "gold", 2nd = a muted "silver", 3rd =
// the brand's own deep pink standing in for bronze. No generic amber/zinc.
const RANK_STYLE = {
    1: { ring: "#FFC95C", medal: "#E0A02E", ribbon: "#FFE2A8", cardBg: "linear-gradient(180deg,#FFF6E2 0%,#FFFFFF 62%)", cardBorder: "#FFE2A8", label: "Hạng 1" },
    2: { ring: "#C9BEC2", medal: "#9A8E92", ribbon: "#E7DEE1", cardBg: "linear-gradient(180deg,#F6F2F3 0%,#FFFFFF 62%)", cardBorder: "#EFE6E8", label: "Hạng 2" },
    3: { ring: "#FF8FAB", medal: "#FF6B9D", ribbon: "#FFD7E1", cardBg: "linear-gradient(180deg,#FFF0F4 0%,#FFFFFF 62%)", cardBorder: "#FFE0E8", label: "Hạng 3" },
} as const;

export function Podium({ entries, activeSort, meId }: Props) {
    if (entries.length === 0) return null;

    return (
        <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
            <PodiumSlot entry={entries[1]} place={2} activeSort={activeSort} meId={meId} />
            <PodiumSlot entry={entries[0]} place={1} activeSort={activeSort} meId={meId} />
            <PodiumSlot entry={entries[2]} place={3} activeSort={activeSort} meId={meId} />
        </div>
    );
}

function PodiumSlot({
    entry,
    place,
    activeSort,
    meId,
}: {
    entry?: LeaderboardEntry;
    place: 1 | 2 | 3;
    activeSort: LeaderboardSort;
    meId?: number;
}) {
    const heights = { 1: "min-h-[15.5rem]", 2: "min-h-[14rem]", 3: "min-h-[13rem]" };
    const lift = place === 1 ? "sm:-translate-y-4" : "";
    const style = RANK_STYLE[place];

    if (!entry) {
        return (
            <div className={`${heights[place]} flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#F0E3E8] p-4 opacity-70`}>
                <span className="text-2xl opacity-40">🌸</span>
                <p className="mt-2 text-xs font-medium text-[#B9AEB2]">{style.label}</p>
            </div>
        );
    }

    const role = entry.roles[0];
    const tier = getTier(entry.longestStreak);
    const isMe = meId != null && entry.userId === meId;

    return (
        <Link to={`/users/${entry.userId}`} className={`block ${lift}`}>
            <div
                className={`${heights[place]} relative flex flex-col items-center rounded-[22px] border px-3 pb-5 pt-7 shadow-[0_8px_22px_rgba(58,46,51,0.07)] transition-transform hover:-translate-y-1`}
                style={{
                    background: style.cardBg,
                    borderColor: isMe ? "#FF6B9D" : style.cardBorder,
                    boxShadow: isMe ? "0 0 0 2px #FF6B9D, 0 8px 22px rgba(58,46,51,0.07)" : undefined,
                }}
            >
                {place === 1 && (
                    <Crown size={26} className="absolute -top-3.5 rotate-[-8deg] fill-[#FFC95C] text-[#E0A02E] drop-shadow-sm" />
                )}
                {isMe && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#FF6B9D] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Bạn
                    </span>
                )}

                <Avatar name={entry.fullName} avatarUrl={entry.avatarUrl} big={place === 1} ringColor={style.ring} />

                <p className="font-display mt-2.5 max-w-full truncate px-1 text-center text-sm font-bold text-[#3A2E33] sm:text-[15px]">
                    {entry.fullName}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                    <span
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                        style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}
                    >
                        <span className="text-[11px] leading-none">{tier.emoji}</span>
                        {tier.label}
                    </span>
                    {role && <span className="text-[10px] font-medium text-[#B9AEB2]">{formatRoleLabel(role)}</span>}
                </div>

                {/* Three real metrics, the sorted one emphasised — mirrors the
                    reference's per-card stat row (Lokal stats / Winrate / KDA). */}
                <div className="mt-3.5 grid w-full grid-cols-3 gap-1 border-t border-[#FBEAF0] pt-3">
                    {METRICS.map((m) => {
                        const on = m.key === activeSort;
                        return (
                            <div key={m.key} className="flex flex-col items-center gap-0.5">
                                <span className="text-[13px] leading-none opacity-90">{m.icon}</span>
                                <span
                                    className="font-display text-[15px] font-bold leading-none tabular-nums"
                                    style={{ color: on ? m.accent : "#3A2E33" }}
                                >
                                    {entry[m.field]}
                                </span>
                                <span className="text-[9px] font-medium leading-none text-[#B9AEB2]">{m.short}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="relative mt-auto flex h-7 w-7 items-center justify-center pt-4">
                    <span className="absolute top-2 h-4 w-2.5 -rotate-[16deg] rounded-b-[3px]" style={{ background: style.ribbon }} />
                    <span className="absolute top-2 h-4 w-2.5 rotate-[16deg] rounded-b-[3px]" style={{ background: style.ribbon }} />
                    <span
                        className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white"
                        style={{ background: style.medal }}
                    >
                        {place}
                    </span>
                </div>
            </div>
        </Link>
    );
}

function Avatar({
    name,
    avatarUrl,
    big,
    ringColor,
}: {
    name: string;
    avatarUrl?: string | null;
    big: boolean;
    ringColor: string;
}) {
    const dim = big ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] text-lg" : "h-14 w-14 text-base";
    const initials = name
        .split(" ")
        .map((p) => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
    const ringStyle: CSSProperties = { boxShadow: `0 0 0 3px #ffffff, 0 0 0 5px ${ringColor}` };

    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className={`${dim} shrink-0 rounded-full object-cover`} style={ringStyle} />;
    }
    return (
        <div
            className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[#FFE5EC] font-bold text-[#FF6B9D]`}
            style={ringStyle}
        >
            {initials || "?"}
        </div>
    );
}
