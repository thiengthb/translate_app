import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LocateFixed } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { profileApi } from "@/api/features/profile.api";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardSort } from "@/types/features/leaderboard";

import { Podium } from "./components/Podium";
import { RankRow } from "./components/RankRow";
import { METRICS, metricFor } from "./tier";

/** Tie-breaks mirror the backend so client-side re-sorting is consistent. */
function sortEntries(entries: LeaderboardEntry[], sort: LeaderboardSort): LeaderboardEntry[] {
    const primary = metricFor(sort).field;
    return [...entries]
        .sort((a, b) => b[primary] - a[primary] || b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak)
        .map((e, i) => ({ ...e, rank: i + 1 }));
}

export default function LeaderboardPage() {
    const [sortBy, setSortBy] = useState<LeaderboardSort>("current");
    // One fetch, sorted client-side per tab: instant tab switches and ranks
    // recomputed to match the active metric.
    const { data: raw = [], isLoading } = useLeaderboard(100, "current");
    const { data: profile } = useQuery({
        queryKey: ["profile", "me"],
        queryFn: profileApi.getProfile,
        staleTime: 5 * 60 * 1000,
    });
    const meId = profile?.id;

    const podiumRef = useRef<HTMLDivElement>(null);
    const meRowRef = useRef<HTMLAnchorElement>(null);

    const { top3, rest, maxima, myRank } = useMemo(() => {
        const sorted = sortEntries(raw, sortBy);
        const max: Record<string, number> = {};
        for (const m of METRICS) max[m.key] = Math.max(1, ...sorted.map((e) => e[m.field]));
        const mine = meId != null ? sorted.find((e) => e.userId === meId) : undefined;
        return { top3: sorted.slice(0, 3), rest: sorted.slice(3), maxima: max, myRank: mine?.rank };
    }, [raw, sortBy, meId]);

    const onBoard = myRank != null;

    const scrollToMe = () => {
        const target = myRank != null && myRank <= 3 ? podiumRef.current : meRowRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <MainLayout pageScroll>
            <div className="w-full space-y-5">
                {/* ─── Hero ────────────────────────────────────────────────── */}
                <div
                    className="relative overflow-hidden rounded-[26px] border border-[#FBEAF0] px-6 py-6 shadow-[0_10px_30px_rgba(255,143,171,0.12)] sm:px-8"
                    style={{ background: "linear-gradient(120deg,#FFF0F4 0%,#FFFFFF 62%)" }}
                >
                    <span className="pointer-events-none absolute right-10 top-6 text-lg text-[#FFC95C]">✦</span>
                    <span className="pointer-events-none absolute right-24 top-11 h-2 w-8 -rotate-[20deg] rounded-full bg-[#FFE0E8]" />

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF6B9D] ring-1 ring-[#FFE0E8]">
                                🏆 Bảng vàng Hanabun
                            </div>
                            <h1 className="font-display text-[26px] font-bold leading-tight text-[#3A2E33] sm:text-[30px]">
                                Những cánh hoa chăm chỉ nhất
                            </h1>
                            <p className="mt-1 max-w-md text-sm text-[#9A8E92]">
                                Giữ chuỗi streak mỗi ngày để leo hạng và nở rộ cùng cả lớp.
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <div className="rounded-2xl bg-white/70 px-4 py-2.5 text-center ring-1 ring-[#FFE0E8]">
                                <div className="font-display text-2xl font-bold leading-none text-[#FF6B9D] tabular-nums">
                                    {raw.length}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium text-[#9A8E92]">người học</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Toolbar: sort pills + jump-to-me ───────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#FFE5EC] p-1">
                        {METRICS.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => setSortBy(m.key)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                                    sortBy === m.key
                                        ? "bg-white text-[#FF6B9D] shadow-[0_2px_8px_rgba(255,143,171,0.28)]"
                                        : "text-[#9A8E92] hover:text-[#FF6B9D]",
                                )}
                            >
                                <span className="text-[13px] leading-none">{m.icon}</span>
                                {m.tab}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={scrollToMe}
                        disabled={!onBoard}
                        title={onBoard ? undefined : "Bạn chưa xuất hiện trên bảng xếp hạng"}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
                            onBoard
                                ? "bg-[#FF6B9D] text-white shadow-[0_4px_12px_rgba(255,107,157,0.35)] hover:bg-[#ff5990]"
                                : "cursor-not-allowed bg-[#F3EAEE] text-[#B9AEB2]",
                        )}
                    >
                        <LocateFixed size={14} />
                        {onBoard ? `Hạng của bạn · #${myRank}` : "Bạn chưa có hạng"}
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="animate-spin text-[#FF6B9D]" size={32} />
                    </div>
                ) : raw.length === 0 ? (
                    <EmptyState
                        className="py-16"
                        icon={<span className="text-2xl">🌱</span>}
                        title="Chưa có ai có streak"
                        description="Hãy là người đầu tiên — học mỗi ngày để lên bảng xếp hạng!"
                    />
                ) : (
                    <>
                        {/* ─── Podium (top 3) ─────────────────────────────── */}
                        <div
                            ref={podiumRef}
                            className="relative overflow-hidden rounded-[26px] border border-[#FBEAF0] px-4 pb-6 pt-11 shadow-[0_10px_30px_rgba(255,143,171,0.12)] sm:px-8"
                            style={{ background: "linear-gradient(120deg,#FFF7F9 0%,#FFFFFF 70%)" }}
                        >
                            <Podium entries={top3} activeSort={sortBy} meId={meId} />
                        </div>

                        {/* ─── Rest of the board ──────────────────────────── */}
                        {rest.length > 0 && (
                            <div className="overflow-hidden rounded-[24px] border border-[#FBEAF0] bg-white shadow-[0_8px_22px_rgba(255,143,171,0.10)]">
                                <h2 className="font-display px-6 pb-2.5 pt-5 text-base font-bold text-[#3A2E33]">
                                    Hạng {rest[0]?.rank} – {rest[rest.length - 1]?.rank}
                                </h2>

                                {/* Column header — widths mirror RankRow exactly. */}
                                <div className="flex items-center gap-3 border-y border-[#FBEAF0] bg-[#FFFBFC] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#B9AEB2] sm:px-6">
                                    <div className="w-7 text-center">#</div>
                                    <div className="w-9 shrink-0" />
                                    <div className="flex-1">Người học</div>
                                    {METRICS.map((m, i) => (
                                        <div
                                            key={m.key}
                                            className={cn(
                                                "w-14 text-right",
                                                i > 0 && m.key !== sortBy && "hidden sm:block",
                                                m.key === sortBy && "text-[#FF6B9D]",
                                            )}
                                        >
                                            {m.short}
                                        </div>
                                    ))}
                                    <div className="w-[6.5rem] text-right">Bậc</div>
                                </div>

                                <ul>
                                    {rest.map((entry) => (
                                        <li key={entry.userId} className="border-b border-[#FBEAF0] last:border-0">
                                            <RankRow
                                                entry={entry}
                                                activeSort={sortBy}
                                                maxima={maxima}
                                                isMe={entry.userId === meId}
                                                ref={entry.userId === meId ? meRowRef : undefined}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
