import { useCallback, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

interface Ripple {
    id: number;
    x: number;
    y: number;
}

interface RippleButtonProps {
    children: ReactNode;
    type?: "button" | "submit";
    variant?: "primary" | "outline" | "danger";
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
}

let rippleId = 0;

const VARIANTS: Record<NonNullable<RippleButtonProps["variant"]>, string> = {
    primary:
        "bg-gradient-to-br from-primary to-[#ff8fab] text-primary-foreground shadow-[0_12px_28px_-10px_rgba(255,107,157,0.9)] hover:shadow-[0_16px_34px_-10px_rgba(255,107,157,1)]",
    outline:
        "bg-white/70 text-foreground border border-border hover:border-primary/50 hover:bg-white",
    danger: "bg-white/70 text-destructive border border-destructive/30 hover:bg-destructive/10",
};

/**
 * A primary action button with two micro-interactions:
 *   - a Material-style ink ripple radiating from the click point, and
 *   - a subtle press/hover scale (via framer-motion `whileTap`/`whileHover`).
 *
 * The pink gradient + glow keeps it firmly on-brand for the Sakura theme.
 */
export function RippleButton({
    children,
    type = "button",
    variant = "primary",
    disabled,
    className,
    onClick,
}: RippleButtonProps) {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const spawn = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const id = rippleId++;
        setRipples((prev) => [
            ...prev,
            { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
        ]);
        // Drop the ripple once its exit animation has had time to finish.
        window.setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 650);
    }, []);

    return (
        <motion.button
            type={type}
            disabled={disabled}
            onClick={onClick}
            onPointerDown={(e) => !disabled && spawn(e as React.MouseEvent<HTMLButtonElement>)}
            whileHover={disabled ? undefined : { scale: 1.03 }}
            whileTap={disabled ? undefined : { scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
                "relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 text-sm font-semibold",
                "cursor-pointer select-none transition-shadow duration-300 disabled:cursor-not-allowed disabled:opacity-60",
                VARIANTS[variant],
                className,
            )}
        >
            <AnimatePresence>
                {ripples.map((r) => (
                    <motion.span
                        key={r.id}
                        className="pointer-events-none absolute h-5 w-5 rounded-full bg-current/40"
                        style={{ left: r.x, top: r.y, translateX: "-50%", translateY: "-50%" }}
                        initial={{ scale: 0, opacity: 0.5 }}
                        animate={{ scale: 12, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                ))}
            </AnimatePresence>
            <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        </motion.button>
    );
}
