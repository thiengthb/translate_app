import { Flame, Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyStreak } from "@/hooks/useStreak";

import { StreakCalendar } from "./components/StreakCalendar";
import { StreakStats } from "./components/StreakStats";

export default function StreakPage() {
    const { data: streak, isLoading } = useMyStreak();

    if (isLoading || !streak) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="w-full space-y-6">
                {/* ─── Hero ──────────────────────────────────────────────── */}
                <Card className="overflow-hidden p-0">
                    <div className="relative bg-gradient-to-br from-orange-500 via-orange-500/90 to-orange-600 text-white">
                        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

                        <CardContent className="relative px-6 py-8 sm:px-8 sm:py-10 flex flex-col sm:flex-row sm:items-center gap-6">
                            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shrink-0">
                                <Flame size={48} className="fill-current" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    {streak.checkedInToday ? (
                                        <Badge className="bg-white/20 hover:bg-white/25 border-0 text-white">
                                            ✓ Đã check-in hôm nay
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-white/15 hover:bg-white/20 border-0 text-white">
                                            Chưa check-in hôm nay
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-5xl sm:text-6xl font-bold tabular-nums">
                                        {streak.currentStreak}
                                    </span>
                                    <span className="text-xl font-medium opacity-90">
                                        ngày liên tiếp
                                    </span>
                                </div>
                                <p className="text-white/90 text-sm sm:text-base">
                                    {streak.currentStreak === 0
                                        ? "Bắt đầu hôm nay để xây dựng chuỗi của bạn!"
                                        : streak.checkedInToday
                                            ? "Tuyệt vời! Tiếp tục duy trì vào ngày mai."
                                            : "Đăng nhập lại vào ngày mai để duy trì chuỗi."}
                                </p>
                            </div>
                        </CardContent>
                    </div>
                </Card>

                {/* ─── Stats ─────────────────────────────────────────────── */}
                <StreakStats streak={streak} />

                {/* ─── Calendar ──────────────────────────────────────────── */}
                <StreakCalendar />
            </div>
        </MainLayout>
    );
}
