import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { useMyStreak } from "@/hooks/useStreak";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import type { RootState } from "@/store/store";

export function StreakBadge() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { data: streak } = useMyStreak(isAuthenticated);
    const navigate = useNavigate();

    if (!isAuthenticated || !streak) return null;

    const isActive = streak.currentStreak > 0;
    const tooltipText = isActive
        ? `Bạn đang có chuỗi ${streak.currentStreak} ngày${streak.checkedInToday ? "" : " — chưa check-in hôm nay"}`
        : "Bạn chưa có streak nào — hãy bắt đầu hôm nay!";

    return (
        <TooltipWrapper content={tooltipText}>
            <button
                onClick={() => navigate("/dashboard")}
                aria-label={tooltipText}
                className={`flex items-center gap-1.5 h-9 px-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                        ? streak.checkedInToday
                            ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        : "text-muted-foreground hover:bg-accent"
                }`}
            >
                <Flame
                    size={16}
                    className={isActive && streak.checkedInToday ? "fill-current" : ""}
                />
                <span className="font-semibold tabular-nums">{streak.currentStreak}</span>
            </button>
        </TooltipWrapper>
    );
}
