import { motion } from "motion/react";
import { Layers, Sparkles, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { GAME_CONFIG } from "../engine";
import type { ScoreReadout } from "../types";
import { CountUp } from "./CountUp";

interface ScorePanelProps {
    readout: ScoreReadout;
    selectedCount: number;
    turnsLeft: number;
    maxTurns: number;
    round: number;
    discardsLeft: number;
    canPlay: boolean;
    canDiscard: boolean;
    busy: boolean;
    onPlay: () => void;
    onDiscard: () => void;
}

function Stat({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string | number;
    danger?: boolean;
}) {
    return (
        <div className="flex flex-col items-center rounded-xl bg-[#fff0f4] px-3 py-2 ring-1 ring-[#fbeaf0]">
            <span className="text-[10px] uppercase tracking-wide text-[#9a8e92]">
                {label}
            </span>
            <span
                className={cn(
                    "text-lg font-bold tabular-nums",
                    danger ? "text-rose-500" : "text-[#3a2e33]",
                )}
            >
                {value}
            </span>
        </div>
    );
}

export function ScorePanel({
    readout,
    selectedCount,
    turnsLeft,
    maxTurns,
    round,
    discardsLeft,
    canPlay,
    canDiscard,
    busy,
    onPlay,
    onDiscard,
}: ScorePanelProps) {
    return (
        <div className="flex h-full w-full flex-col gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-[0_12px_40px_-20px_rgba(255,107,157,0.5)] backdrop-blur-md">
            {/* point × mult readout */}
            <div className="flex items-stretch gap-2">
                <motion.div
                    key={`p-${readout.point}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex flex-1 flex-col items-center justify-center rounded-xl bg-sky-50 py-2 ring-1 ring-sky-200"
                >
                    <span className="text-[10px] uppercase tracking-wide text-sky-500">
                        Điểm
                    </span>
                    <span className="text-3xl font-black tabular-nums text-sky-600">
                        {readout.point}
                    </span>
                </motion.div>
                <div className="flex items-center text-2xl font-black text-[#d8b9c4]">
                    ×
                </div>
                <motion.div
                    key={`m-${readout.mult}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex flex-1 flex-col items-center justify-center rounded-xl bg-rose-50 py-2 ring-1 ring-rose-200"
                >
                    <span className="text-[10px] uppercase tracking-wide text-rose-400">
                        Mult
                    </span>
                    <span className="text-3xl font-black tabular-nums text-rose-500">
                        {readout.mult}
                    </span>
                </motion.div>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#fff7e6] py-2 ring-1 ring-[#ffc95c]/40">
                <Sparkles className="size-4 text-[#e0a520]" />
                <span className="text-sm text-[#a06a12]">Điểm lượt này:</span>
                <motion.span
                    key={readout.turnScore}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    className="text-xl font-black tabular-nums text-[#a06a12]"
                >
                    <CountUp value={readout.turnScore} duration={0.45} />
                </motion.span>
            </div>

            {/* run stats */}
            <div className="grid grid-cols-3 gap-2">
                <Stat
                    label="Lượt"
                    value={`${turnsLeft}/${maxTurns}`}
                    danger={turnsLeft <= 1}
                />
                <Stat label="Vòng" value={`${round}/${GAME_CONFIG.winRound}`} />
                <Stat label="Bỏ bài" value={discardsLeft} />
            </div>

            {/* actions */}
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onPlay}
                    disabled={!canPlay || busy}
                    className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold transition-all",
                        "bg-gradient-to-b from-[#ff6b9d] to-[#ff8fab] text-white shadow-lg shadow-[#ff6b9d]/30",
                        "hover:from-[#ff5b93] hover:to-[#ff7fa1] active:scale-[0.98]",
                        "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
                    )}
                >
                    <Layers className="size-5" />
                    Đánh bài {selectedCount > 0 ? `(${selectedCount})` : ""}
                </button>
                <button
                    type="button"
                    onClick={onDiscard}
                    disabled={!canDiscard || busy}
                    className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                        "bg-[#ffe5ec] text-[#c23d6d] ring-1 ring-[#ffc2d4]",
                        "hover:bg-[#ffd6e2] active:scale-[0.98]",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                >
                    <Trash2 className="size-4" />
                    Bỏ &amp; rút lại
                </button>
                <p className="text-center text-[11px] leading-relaxed text-[#9a8e92]">
                    Chọn tối đa {GAME_CONFIG.maxSelect} lá rồi <b className="text-[#c23d6d]">Đánh bài</b>.
                    Mỗi lần đánh tốn 1 lượt và đổi sang chữ mới.
                </p>
            </div>
        </div>
    );
}
