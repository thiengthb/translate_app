import { AnimatePresence, motion } from "motion/react";

import { RadicalCard } from "./RadicalCard";
import type { RadicalCard as RadicalCardType } from "../types";

interface HandProps {
    cards: RadicalCardType[];
    selectedIds: string[];
    disabled: boolean;
    onToggle: (id: string) => void;
}

export function Hand({ cards, selectedIds, disabled, onToggle }: HandProps) {
    return (
        <div className="flex flex-wrap items-end justify-center gap-1.5 sm:gap-2">
            <AnimatePresence mode="popLayout">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.id}
                        layout
                        initial={{ opacity: 0, y: 48, rotate: -6, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.7 }}
                        transition={{
                            type: "spring",
                            stiffness: 360,
                            damping: 28,
                            delay: i * 0.045,
                        }}
                    >
                        <RadicalCard
                            card={card}
                            selected={selectedIds.includes(card.id)}
                            disabled={disabled}
                            onClick={() => onToggle(card.id)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
