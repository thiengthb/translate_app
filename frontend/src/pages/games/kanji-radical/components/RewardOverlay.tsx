import { motion } from "motion/react";
import { Dices, SkipForward, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { BUFFS, MAX_BUFFS, RARITY_META } from "../buffs";
import { formatNumber } from "../engine";

interface RewardOverlayProps {
    round: number;
    score: number;
    targetScore: number;
    buffs: string[];
    rewardOptions: string[];
    rerollsLeft: number;
    onChoose: (id: string) => void;
    onReroll: () => void;
    onSkip: () => void;
}

/**
 * The "qua màn" reward screen. On clearing a round the player picks one of
 * three rarity-weighted charms (or skips / rerolls) — the run's power-growth
 * step. Mirrors the reference game's item reward popup.
 */
export function RewardOverlay({
    round,
    score,
    targetScore,
    buffs,
    rewardOptions,
    rerollsLeft,
    onChoose,
    onReroll,
    onSkip,
}: RewardOverlayProps) {
    const full = buffs.length >= MAX_BUFFS;
    const carry = Math.max(0, score - targetScore);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-slate-950/85 p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-slate-900 p-6 text-center ring-1 ring-white/10"
            >
                <div className="flex flex-col items-center gap-1">
                    <Trophy className="size-9 text-amber-300" />
                    <h2 className="text-2xl font-black text-white">
                        Qua vòng {round}! 🎉
                    </h2>
                    <p className="text-xs text-slate-400">
                        Chọn một <span className="text-fuchsia-300">lá bùa</span> để
                        mạnh hơn cho các vòng sau
                        {carry > 0 && (
                            <>
                                {" "}
                                · cộng dồn{" "}
                                <span className="text-amber-200">
                                    {formatNumber(carry)}
                                </span>{" "}
                                điểm
                            </>
                        )}
                    </p>
                </div>

                {/* three charm choices */}
                <div className="grid w-full grid-cols-3 gap-3">
                    {rewardOptions.map((id) => {
                        const def = BUFFS[id];
                        if (!def) return null;
                        const meta = RARITY_META[def.rarity];
                        const owned = buffs.includes(def.id);
                        const disabled = full || owned;
                        return (
                            <button
                                key={def.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChoose(def.id)}
                                className={cn(
                                    "group flex flex-col items-center gap-2 rounded-xl bg-gradient-to-b to-slate-950/60 p-3 text-center ring-1 transition-all",
                                    meta.glow,
                                    meta.ring,
                                    disabled
                                        ? "cursor-not-allowed opacity-40"
                                        : "hover:-translate-y-1 hover:ring-2 active:scale-[0.98]",
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex size-14 items-center justify-center rounded-lg bg-slate-900/70 text-3xl font-black ring-1",
                                        meta.ring,
                                        meta.text,
                                    )}
                                >
                                    {def.glyph}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    {meta.label}
                                </span>
                                <span className={cn("text-sm font-bold", meta.text)}>
                                    {def.name}
                                </span>
                                <span className="text-[11px] leading-snug text-slate-300">
                                    {def.desc}
                                </span>
                                {owned && (
                                    <span className="text-[10px] text-slate-500">
                                        Đã sở hữu
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {full && (
                    <p className="text-xs text-rose-300">
                        Kho bùa đã đầy ({buffs.length}/{MAX_BUFFS}) — bỏ qua để
                        tiếp tục.
                    </p>
                )}

                {/* actions */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onReroll}
                        disabled={rerollsLeft <= 0}
                        className="flex items-center gap-2 rounded-xl bg-slate-700/60 px-4 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition-all hover:bg-slate-600/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Dices className="size-4" />
                        Đổi bùa ({rerollsLeft})
                    </button>
                    <button
                        type="button"
                        onClick={onSkip}
                        className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-300 ring-1 ring-white/10 transition-all hover:bg-slate-700/60 active:scale-[0.98]"
                    >
                        <SkipForward className="size-4" />
                        Bỏ qua
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
