import { Flame } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoLabel } from "@/components/common/InfoLabel";
import type { TopStreakUser } from "@/types/features/dashboard";

interface Props {
    users: TopStreakUser[];
}

export function TopStreaksList({ users }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Flame size={16} className="text-orange-500 fill-orange-500" />
                    <InfoLabel title="Bảng vàng streak" info="Top 10 người dùng có streak cao nhất" />
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {users.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                        Chưa ai có streak
                    </div>
                ) : (
                    <ul className="divide-y">
                        {users.map((u, idx) => (
                            <li
                                key={u.userId}
                                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <RankBadge rank={idx + 1} />
                                <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {u.fullName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold tabular-nums">
                                        <Flame size={13} className="fill-current" />
                                        {u.currentStreak}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        cao nhất {u.longestStreak}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function RankBadge({ rank }: { rank: number }) {
    const styles =
        rank === 1
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : rank === 2
                ? "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300"
                : rank === 3
                    ? "bg-orange-700/15 text-orange-700 dark:text-orange-300"
                    : "bg-muted text-muted-foreground";
    return (
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${styles}`}>
            {rank}
        </div>
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
            <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover shrink-0" />
        );
    }
    return (
        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials || "?"}
        </div>
    );
}
