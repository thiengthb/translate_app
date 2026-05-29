import { Crown, Flame } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { LeaderboardEntry } from "@/types/features/leaderboard";

interface Props {
    entries: LeaderboardEntry[];
}

export function Podium({ entries }: Props) {
    if (entries.length === 0) return null;

    const first = entries[0];
    const second = entries[1];
    const third = entries[2];

    return (
        <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
            <PodiumSlot entry={second} place={2} />
            <PodiumSlot entry={first} place={1} />
            <PodiumSlot entry={third} place={3} />
        </div>
    );
}

function PodiumSlot({ entry, place }: { entry?: LeaderboardEntry; place: 1 | 2 | 3 }) {
    const heights = { 1: "h-48 sm:h-56", 2: "h-40 sm:h-44", 3: "h-36 sm:h-40" };
    const styles = {
        1: {
            ring: "ring-amber-400",
            badge: "bg-amber-500 text-white",
            bg: "bg-gradient-to-b from-amber-500/15 to-transparent",
            label: "Hạng 1",
        },
        2: {
            ring: "ring-zinc-300 dark:ring-zinc-500",
            badge: "bg-zinc-400 text-white",
            bg: "bg-gradient-to-b from-zinc-300/15 to-transparent",
            label: "Hạng 2",
        },
        3: {
            ring: "ring-orange-600",
            badge: "bg-orange-700 text-white",
            bg: "bg-gradient-to-b from-orange-600/15 to-transparent",
            label: "Hạng 3",
        },
    };
    const style = styles[place];

    if (!entry) {
        return (
            <Card className={`${heights[place]} ${style.bg} flex flex-col items-center justify-end p-4 opacity-50`}>
                <p className="text-xs text-muted-foreground">{style.label}</p>
            </Card>
        );
    }

    const role = entry.roles[0];

    return (
        <Link to={`/users/${entry.userId}`} className="block">
            <Card
                className={`${heights[place]} ${style.bg} flex flex-col items-center justify-end pt-5 px-3 pb-4 hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden`}
            >
                {place === 1 && (
                    <Crown
                        size={20}
                        className="absolute top-3 right-3 text-amber-500 fill-amber-500"
                    />
                )}

                <div className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0 w-full">
                    <UserAvatar
                        name={entry.fullName}
                        avatarUrl={entry.avatarUrl}
                        size={place === 1 ? "lg" : "md"}
                        ringClass={`ring-2 ${style.ring}`}
                    />
                    <div className="text-center min-w-0 w-full">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {entry.fullName}
                        </p>
                        {role && (
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                                {formatRoleLabel(role)}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold tabular-nums">
                        <Flame size={14} className="fill-current" />
                        {entry.currentStreak}
                    </div>
                </div>

                <div
                    className={`mt-2 inline-flex items-center justify-center rounded-full h-7 w-7 text-xs font-bold ${style.badge}`}
                >
                    {place}
                </div>
            </Card>
        </Link>
    );
}

function UserAvatar({
    name,
    avatarUrl,
    size,
    ringClass,
}: {
    name: string;
    avatarUrl?: string | null;
    size: "md" | "lg";
    ringClass: string;
}) {
    const dim = size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20 text-lg" : "h-14 w-14 sm:h-16 sm:w-16 text-base";
    const initials = name
        .split(" ")
        .map((p) => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className={`${dim} rounded-full object-cover shrink-0 ${ringClass} ring-offset-2 ring-offset-background`}
            />
        );
    }
    return (
        <div
            className={`${dim} rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0 ${ringClass} ring-offset-2 ring-offset-background`}
        >
            {initials || "?"}
        </div>
    );
}
