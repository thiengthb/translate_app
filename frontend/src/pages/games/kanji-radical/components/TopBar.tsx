import type { ReactNode } from "react";
import { motion } from "motion/react";
import { HelpCircle, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

import { formatNumber } from "../engine";

interface TopBarProps {
    score: number;
    targetScore: number;
    progress: number;
    round: number;
    highScore: number;
    muted: boolean;
    onToggleMute: () => void;
    onHelp: () => void;
    onRestart: () => void;
}

function IconButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className="flex size-9 items-center justify-center rounded-lg bg-slate-800/70 text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-slate-700/70 hover:text-white"
        >
            {children}
        </button>
    );
}

export function TopBar({
    score,
    targetScore,
    progress,
    round,
    highScore,
    muted,
    onToggleMute,
    onHelp,
    onRestart,
}: TopBarProps) {
    const reached = score >= targetScore;
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-sm font-bold text-amber-300 ring-1 ring-amber-400/30">
                        Vòng {round}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Trophy className="size-3.5 text-amber-400" />
                        Kỷ lục {formatNumber(highScore)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <IconButton label="Cách chơi" onClick={onHelp}>
                        <HelpCircle className="size-4" />
                    </IconButton>
                    <IconButton label={muted ? "Bật âm" : "Tắt âm"} onClick={onToggleMute}>
                        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                    </IconButton>
                    <IconButton label="Chơi lại" onClick={onRestart}>
                        <RotateCcw className="size-4" />
                    </IconButton>
                </div>
            </div>

            <div className="relative h-7 w-full overflow-hidden rounded-full bg-slate-950/60 ring-1 ring-white/10">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22 }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-white drop-shadow">
                    <span className={reached ? "text-emerald-200" : undefined}>
                        {formatNumber(score)} / {formatNumber(targetScore)}
                    </span>
                </div>
            </div>
        </div>
    );
}
