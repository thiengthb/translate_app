import { Flame } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { LeaderboardEntry } from "@/types/features/leaderboard";

interface Props {
    entry: LeaderboardEntry;
    highlight?: boolean;
}

export function RankRow({ entry, highlight }: Props) {
    return (
        <Link
            to={`/users/${entry.userId}`}
            className={`flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/40 transition-colors ${
                highlight ? "bg-primary/5" : ""
            }`}
        >
            <div className="w-8 text-center shrink-0">
                <span className="text-sm font-bold text-muted-foreground tabular-nums">
                    #{entry.rank}
                </span>
            </div>

            <UserAvatar name={entry.fullName} avatarUrl={entry.avatarUrl} />

            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                    {entry.fullName}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {entry.roles.slice(0, 2).map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">
                            {formatRoleLabel(r)}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="hidden sm:flex flex-col items-end shrink-0 text-xs text-muted-foreground tabular-nums min-w-16">
                <span>{entry.totalActiveDays} ngày</span>
                <span>best {entry.longestStreak}</span>
            </div>

            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold tabular-nums shrink-0 min-w-12 justify-end">
                <Flame size={15} className="fill-current" />
                {entry.currentStreak}
            </div>
        </Link>
    );
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
    const initials = name
        .split(" ")
        .map((p) => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (avatarUrl) {
        return (
            <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
        );
    }
    return (
        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials || "?"}
        </div>
    );
}
