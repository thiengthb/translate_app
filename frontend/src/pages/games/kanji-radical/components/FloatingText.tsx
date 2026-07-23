import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { FloatingText as FloatingTextType } from "../types";

const KIND_STYLE: Record<FloatingTextType["kind"], string> = {
    base: "text-[#a06a12]",
    point: "text-emerald-600",
    level: "text-emerald-600",
    mult: "text-cyan-600",
    chain: "text-orange-500",
    fail: "text-rose-500",
    penalty: "text-rose-500",
    buff: "text-fuchsia-600",
};

export function FloatingText({ float }: { float: FloatingTextType }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: -26, scale: 1 }}
            exit={{ opacity: 0, y: -44 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
                "pointer-events-none whitespace-nowrap text-center text-sm font-extrabold [text-shadow:0_1px_2px_rgba(255,255,255,0.8)]",
                KIND_STYLE[float.kind],
            )}
        >
            {float.text}
        </motion.div>
    );
}
