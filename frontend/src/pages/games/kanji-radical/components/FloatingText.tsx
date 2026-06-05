import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { FloatingText as FloatingTextType } from "../types";

const KIND_STYLE: Record<FloatingTextType["kind"], string> = {
    base: "text-amber-200",
    point: "text-emerald-300",
    level: "text-emerald-300",
    mult: "text-cyan-300",
    chain: "text-orange-300",
    fail: "text-rose-400",
    penalty: "text-rose-300",
    buff: "text-fuchsia-300",
};

export function FloatingText({ float }: { float: FloatingTextType }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: -26, scale: 1 }}
            exit={{ opacity: 0, y: -44 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
                "pointer-events-none whitespace-nowrap text-center text-sm font-bold drop-shadow",
                KIND_STYLE[float.kind],
            )}
        >
            {float.text}
        </motion.div>
    );
}
