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

/**
 * A washi karuta card — the game's signature element. A white→pink-wash face
 * with a hairline gold frame and a corner stroke index, like a real karuta
 *札. On a correct match a gold-leaf shimmer sweeps across it.
 */
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
            animate={
                resolve === "success"
                    ? { y: [0, -14, 0], scale: [1, 1.12, 1] }
                    : { y: selected ? -16 : 0 }
            }
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={cn(
                "group relative flex shrink-0 select-none flex-col items-center justify-between overflow-hidden rounded-2xl border text-[#3a2e33] shadow-[0_8px_20px_-10px_rgba(255,107,157,0.5)] transition-colors",
                "bg-gradient-to-b from-white to-[#ffe9f0]",
                compact ? "h-24 w-16 p-1.5" : "h-28 w-20 p-2 sm:h-32 sm:w-24",
                disabled && "cursor-default",
                !disabled && "cursor-pointer hover:shadow-[0_12px_28px_-8px_rgba(255,107,157,0.6)]",
                selected
                    ? "border-[#ff8fab] ring-2 ring-[#ff8fab] shadow-[0_12px_28px_-8px_rgba(255,143,171,0.7)]"
                    : "border-[#f0c98a]/70",
                resolve === "success" &&
                    "border-emerald-400 ring-2 ring-emerald-300",
                resolve === "fail" &&
                    "border-rose-300 ring-2 ring-rose-300 from-rose-50 to-rose-100",
            )}
        >
            {/* gold-leaf shimmer sweep on a correct match */}
            {resolve === "success" && (
                <motion.span
                    aria-hidden
                    initial={{ x: "-120%", opacity: 0.9 }}
                    animate={{ x: "120%", opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-[#ffe08a]/80 to-transparent"
                />
            )}

            {/* stroke count — top-left corner index, like a karuta 札 */}
            <span className="absolute left-1.5 top-1.5 text-[10px] font-semibold text-[#c9a24a]">
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
                        "font-bold tracking-wide text-[#d14b7e]",
                        compact ? "text-xs" : "text-sm",
                    )}
                >
                    {card.hanViet}
                </span>
                {!compact && (
                    <span className="line-clamp-1 text-[10px] text-[#9a8e92]">
                        {card.meaning}
                    </span>
                )}
            </span>
        </motion.button>
    );
}
