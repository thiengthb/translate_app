import { AnimatePresence, motion } from "motion/react";

import { RadicalCard } from "./RadicalCard";
import { FloatingText } from "./FloatingText";
import { PetalBurst } from "./PetalBurst";
import type { FloatingText as FloatingTextType, PlayedCard } from "../types";

interface PlayAreaProps {
    played: PlayedCard[];
    floats: FloatingTextType[];
}

const REDUCE_MOTION =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The centre stage where thrown cards land while a turn resolves. Each card
 * stacks its own floating score labels directly above it.
 */
export function PlayArea({ played, floats }: PlayAreaProps) {
    return (
        <div className="flex flex-1 min-h-0 items-center justify-center gap-3">
            <AnimatePresence>
                {played.map((pc) => {
                    const cardFloats = floats.filter((f) => f.cardId === pc.card.id);
                    return (
                        <motion.div
                            key={pc.card.id}
                            layout
                            initial={{ opacity: 0, y: 60, scale: 0.6 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ type: "spring", stiffness: 320, damping: 26 }}
                            className="relative"
                        >
                            {/* floating labels rise from just above the card */}
                            <div className="pointer-events-none absolute inset-x-0 -top-2 flex flex-col items-center">
                                <AnimatePresence>
                                    {cardFloats.map((f) => (
                                        <FloatingText key={f.id} float={f} />
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* petal + gold-spark puff the instant a match lands */}
                            {!REDUCE_MOTION && pc.state === "success" && <PetalBurst />}

                            <RadicalCard card={pc.card} resolve={pc.state === "pending" ? null : pc.state} compact disabled />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
