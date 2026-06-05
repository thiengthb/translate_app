import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { RadicalCard as RadicalCardType } from "../types";

const JP_SERIF =
    '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif';

interface RadicalCardProps {
    card: RadicalCardType;
    selected?: boolean;
    disabled?: boolean;
    /** Resolution highlight while a turn is scoring. */
    resolve?: "success" | "fail" | null;
    onClick?: () => void;
    /** Smaller variant used in the centre play area. */
    compact?: boolean;
}

export function RadicalCard({
    card,
    selected = false,
    disabled = false,
    resolve = null,
    onClick,
    compact = false,
}: RadicalCardProps) {
    return (
        <motion.button
            type="button"
            layout
            disabled={disabled}
            onClick={onClick}
            whileHover={disabled ? undefined : { y: -8 }}
            animate={{ y: selected ? -16 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
                "group relative flex shrink-0 select-none flex-col items-center justify-between rounded-xl border text-slate-900 shadow-lg transition-colors",
                "bg-gradient-to-b from-[#fdf6e3] to-[#f3e7c4]",
                compact ? "h-24 w-16 p-1.5" : "h-28 w-20 p-2 sm:h-32 sm:w-24",
                disabled && "cursor-default",
                !disabled && "cursor-pointer hover:shadow-xl",
                selected
                    ? "border-amber-400 ring-2 ring-amber-400 shadow-amber-500/30"
                    : "border-amber-900/20",
                resolve === "success" &&
                    "border-emerald-400 ring-2 ring-emerald-400 shadow-emerald-500/40",
                resolve === "fail" &&
                    "border-rose-400 ring-2 ring-rose-400 from-rose-100 to-rose-200",
            )}
        >
            {/* stroke count — top-left corner flavour */}
            <span className="absolute left-1.5 top-1.5 text-[10px] font-semibold text-amber-900/50">
                {card.strokes}画
            </span>

            <span
                className={cn(
                    "flex flex-1 items-center justify-center leading-none",
                    compact ? "text-3xl" : "text-4xl sm:text-5xl",
                )}
                style={{ fontFamily: JP_SERIF }}
            >
                {card.char}
            </span>

            <span className="flex w-full flex-col items-center gap-0.5">
                <span
                    className={cn(
                        "font-bold tracking-wide text-amber-900",
                        compact ? "text-xs" : "text-sm",
                    )}
                >
                    {card.hanViet}
                </span>
                {!compact && (
                    <span className="line-clamp-1 text-[10px] text-amber-900/60">
                        {card.meaning}
                    </span>
                )}
            </span>
        </motion.button>
    );
}
