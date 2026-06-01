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
        <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3">
            <AnimatePresence mode="popLayout">
                {cards.map((card) => (
                    <motion.div
                        key={card.id}
                        layout
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 360, damping: 28 }}
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
