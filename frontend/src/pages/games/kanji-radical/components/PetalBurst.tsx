import { useMemo } from "react";
import { motion } from "motion/react";

/**
 * A one-shot puff of sakura petals + gold sparks, centred on its host. Rendered
 * for a card the instant it resolves as a correct match (mounted only then, so
 * mounting IS the trigger). Petals fan outward, drift, spin, and fade. Purely
 * decorative + pointer-transparent; skipped under reduced-motion by the caller.
 */
const PETALS = 8;

export function PetalBurst() {
    const bits = useMemo(
        () =>
            Array.from({ length: PETALS }, (_, i) => {
                const angle = (i / PETALS) * Math.PI * 2 + Math.random() * 0.5;
                const dist = 34 + Math.random() * 30;
                return {
                    key: i,
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist - 10, // bias upward
                    rot: (Math.random() * 2 - 1) * 220,
                    size: 7 + Math.random() * 7,
                    gold: i % 3 === 0,
                    delay: Math.random() * 0.06,
                };
            }),
        [],
    );

    return (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            {bits.map((b) => (
                <motion.span
                    key={b.key}
                    initial={{ opacity: 0, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                    animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.2, 1, 1, 0.9],
                        x: b.x,
                        y: b.y,
                        rotate: b.rot,
                    }}
                    transition={{ duration: 0.85, delay: b.delay, ease: "easeOut" }}
                    className="absolute rounded-[45%_55%_50%_50%/55%_45%_55%_45%]"
                    style={{
                        width: b.size,
                        height: b.size,
                        background: b.gold
                            ? "radial-gradient(circle at 35% 30%, #ffe08a, #ffc95c)"
                            : "radial-gradient(circle at 35% 30%, #ffffff, #ff8fab)",
                        boxShadow: b.gold
                            ? "0 0 6px rgba(255,201,92,0.6)"
                            : "0 0 6px rgba(255,143,171,0.5)",
                    }}
                />
            ))}
        </div>
    );
}
