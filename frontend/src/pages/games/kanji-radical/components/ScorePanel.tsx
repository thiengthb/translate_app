import { motion } from "motion/react";
import { Layers, Sparkles, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatNumber, GAME_CONFIG } from "../engine";
import type { ScoreReadout } from "../types";

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
        <div className="flex flex-col items-center rounded-lg bg-slate-950/40 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                {label}
            </span>
            <span
                className={cn(
                    "text-lg font-bold tabular-nums",
                    danger ? "text-rose-300" : "text-slate-100",
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
        <div className="flex h-full w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-xl backdrop-blur">
            {/* point × mult readout */}
            <div className="flex items-stretch gap-2">
                <motion.div
                    key={`p-${readout.point}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex flex-1 flex-col items-center justify-center rounded-xl bg-sky-500/15 py-2 ring-1 ring-sky-400/30"
                >
                    <span className="text-[10px] uppercase tracking-wide text-sky-200/80">
                        Điểm
                    </span>
                    <span className="text-3xl font-black tabular-nums text-sky-100">
                        {readout.point}
                    </span>
                </motion.div>
                <div className="flex items-center text-2xl font-black text-slate-500">
                    ×
                </div>
                <motion.div
                    key={`m-${readout.mult}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex flex-1 flex-col items-center justify-center rounded-xl bg-rose-500/15 py-2 ring-1 ring-rose-400/30"
                >
                    <span className="text-[10px] uppercase tracking-wide text-rose-200/80">
                        Mult
                    </span>
                    <span className="text-3xl font-black tabular-nums text-rose-100">
                        {readout.mult}
                    </span>
                </motion.div>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 py-2 ring-1 ring-amber-400/30">
                <Sparkles className="size-4 text-amber-300" />
                <span className="text-sm text-amber-200/80">Điểm lượt này:</span>
                <motion.span
                    key={readout.turnScore}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    className="text-xl font-black tabular-nums text-amber-200"
                >
                    {formatNumber(readout.turnScore)}
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
                        "bg-gradient-to-b from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-orange-500/30",
                        "hover:from-amber-300 hover:to-orange-400 active:scale-[0.98]",
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
                        "bg-slate-700/60 text-slate-200 ring-1 ring-white/10",
                        "hover:bg-slate-600/60 active:scale-[0.98]",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                >
                    <Trash2 className="size-4" />
                    Bỏ &amp; rút lại
                </button>
                <p className="text-center text-[11px] leading-relaxed text-slate-500">
                    Chọn tối đa {GAME_CONFIG.maxSelect} lá rồi <b className="text-slate-300">Đánh bài</b>.
                    Mỗi lần đánh tốn 1 lượt và đổi sang chữ mới.
                </p>
            </div>
        </div>
    );
}
