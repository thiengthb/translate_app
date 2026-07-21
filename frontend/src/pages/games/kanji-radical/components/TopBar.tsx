import type { ReactNode } from "react";
import { motion } from "motion/react";
import { HelpCircle, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

import { formatNumber } from "../engine";
import { CountUp } from "./CountUp";

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
            className="flex size-9 items-center justify-center rounded-xl border border-white/60 bg-white/70 text-[#8a6b74] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#ff6b9d]"
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
                    <span className="rounded-lg border border-[#ff6b9d]/25 bg-[#ffe5ec] px-2.5 py-1 text-sm font-bold text-[#ff6b9d]">
                        Vòng {round}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#9a8e92]">
                        <Trophy className="size-3.5 text-[#ffc95c]" />
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

            <div className="relative h-7 w-full overflow-hidden rounded-full border border-white/60 bg-white/60 shadow-inner backdrop-blur-sm">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ff8fab] via-[#ff6b9d] to-[#ffc95c]"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22 }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums drop-shadow-sm">
                    <span className={reached ? "text-[#1f9d6b]" : "text-[#5a4650]"}>
                        <CountUp value={score} /> / {formatNumber(targetScore)}
                    </span>
                </div>
            </div>
        </div>
    );
}
