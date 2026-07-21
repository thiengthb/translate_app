import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";

import { InfoLabel } from "@/components/common/InfoLabel";
import { cn } from "@/lib/utils";

/**
 * Shared visual language for the redesigned Profile page.
 *
 * Everything here leans on the fixed Sakura candy palette (see index.css):
 * soft pastel-pink washes, generous rounding, frosted-glass surfaces and a
 * warm pink glow instead of a hard grey shadow. Keeping these primitives in
 * one file lets every card read as one coherent, Awwwards-tier system.
 */

/* Frosted glass surface — translucent white + blur + a warm pink glow.
   A faint inset highlight along the top edge sells the "glass" depth. */
export const GLASS = cn(
    "relative rounded-[28px] border border-white/70 bg-white/55 backdrop-blur-xl",
    "shadow-[0_18px_50px_-18px_rgba(255,107,157,0.45)]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[28px]",
    "before:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] before:content-['']",
);

/* Staggered entrance: each card fades + lifts in, ordered by `index`. A gentle
   spring keeps it feeling soft rather than snappy. Honour reduced-motion by
   passing `reduce` — the card then just appears. */
export const cardReveal: Variants = {
    hidden: ([, reduce]: [number, boolean]) =>
        reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 26, scale: 0.985 },
    show: ([index, reduce]: [number, boolean]) =>
        reduce
            ? { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } }
            : {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                      delay: index * 0.09,
                      type: "spring",
                      stiffness: 130,
                      damping: 18,
                      mass: 0.7,
                  },
              },
};

interface RevealCardProps {
    /** Stagger order — earlier cards reveal first. */
    index?: number;
    reduce?: boolean;
    className?: string;
    children: ReactNode;
}

/** A frosted-glass card that reveals itself on mount, ordered by `index`. */
export function RevealCard({ index = 0, reduce = false, className, children }: RevealCardProps) {
    return (
        <motion.section
            variants={cardReveal}
            custom={[index, reduce]}
            initial="hidden"
            animate="show"
            className={cn(GLASS, className)}
        >
            {children}
        </motion.section>
    );
}

interface CardHeadingProps {
    icon: ReactNode;
    title: string;
    info?: string;
    action?: ReactNode;
    className?: string;
}

/** Icon-chip + title row shared by every content card. */
export function CardHeading({ icon, title, info, action, className }: CardHeadingProps) {
    return (
        <div className={cn("flex items-center justify-between gap-3", className)}>
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#ff8fab] text-white shadow-[0_8px_18px_-6px_rgba(255,107,157,0.75)]">
                    {icon}
                </span>
                <CardTitleText title={title} info={info} />
            </div>
            {action}
        </div>
    );
}

function CardTitleText({ title, info }: { title: string; info?: string }) {
    return (
        <h2 className="font-display text-[17px] font-semibold leading-tight text-foreground">
            <InfoLabel title={title} info={info} />
        </h2>
    );
}

interface MetaPillProps {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    muted?: boolean;
}

/**
 * A frosted metadata pill (Email / Phone / Joined …). The icon sits in its own
 * soft pink capsule; label above, value below — compact enough to wrap into a
 * responsive row of pills under the hero.
 */
export function MetaPill({ icon, label, value, muted }: MetaPillProps) {
    return (
        <div className="group flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/60 px-3.5 py-2 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_10px_24px_-12px_rgba(255,107,157,0.6)]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-transform duration-300 group-hover:scale-110">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                </p>
                <p
                    className={cn(
                        "truncate text-sm font-medium",
                        muted ? "italic text-muted-foreground" : "text-foreground",
                    )}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}
