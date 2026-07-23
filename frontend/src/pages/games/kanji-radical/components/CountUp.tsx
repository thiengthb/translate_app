import { useEffect, useRef } from "react";
import gsap from "gsap";

import { formatNumber } from "../engine";

/**
 * GSAP count-up number. Tweens from the previous value to the new one whenever
 * `value` changes, writing the interpolated (thousands-formatted) number
 * straight into the span — so scores roll up like a slot counter instead of
 * snapping. Respects reduced-motion (snaps instantly).
 */
export function CountUp({
    value,
    className,
    duration = 0.6,
}: {
    value: number;
    className?: string;
    duration?: number;
}) {
    const ref = useRef<HTMLSpanElement | null>(null);
    const prev = useRef(value);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const from = prev.current;
        prev.current = value;

        if (reduce || from === value) {
            el.textContent = formatNumber(value);
            return;
        }

        const obj = { n: from };
        const tween = gsap.to(obj, {
            n: value,
            duration,
            ease: "power2.out",
            onUpdate: () => {
                el.textContent = formatNumber(Math.round(obj.n));
            },
        });
        return () => {
            tween.kill();
        };
    }, [value, duration]);

    return <span ref={ref} className={className}>{formatNumber(value)}</span>;
}
