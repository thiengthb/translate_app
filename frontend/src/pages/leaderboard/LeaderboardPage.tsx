import { useState } from "react";
import { Flame, Loader2, Trophy } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardSort } from "@/types/features/leaderboard";

import { Podium } from "./components/Podium";
import { RankRow } from "./components/RankRow";

export default function LeaderboardPage() {
    const [sortBy, setSortBy] = useState<LeaderboardSort>("current");
    const { data: entries = [], isLoading } = useLeaderboard(50, sortBy);

    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <MainLayout>
            <div className="w-full space-y-6">
                {/* ─── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                            <Trophy size={26} className="text-amber-500 fill-amber-500/20" />
                            Bảng xếp hạng
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Xem những người dùng tích cực nhất hệ thống.
                        </p>
                    </div>

                    <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as LeaderboardSort)}>
                        <TabsList>
                            <TabsTrigger value="current" className="gap-1.5">
                                <Flame size={13} />
                                Streak hiện tại
                            </TabsTrigger>
                            <TabsTrigger value="longest" className="gap-1.5">
                                <Trophy size={13} />
                                Streak dài nhất
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : entries.length === 0 ? (
                    <EmptyState
                        className="py-16"
                        icon={<Flame className="size-7" />}
                        title="Chưa có ai có streak"
                        description="Hãy là người đầu tiên — học mỗi ngày để lên bảng xếp hạng!"
                    />
                ) : (
                    <>
                        {/* ─── Podium (top 3) ─────────────────────────────── */}
                        <Podium entries={top3} />

                        {/* ─── Rest of the board ──────────────────────────── */}
                        {rest.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">
                                        Hạng {rest[0]?.rank} — {rest[rest.length - 1]?.rank}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ul className="divide-y">
                                        {rest.map((entry) => (
                                            <li key={entry.userId}>
                                                <RankRow entry={entry} />
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
