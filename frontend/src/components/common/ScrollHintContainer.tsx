import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Axis = "vertical" | "horizontal" | "both";

interface ScrollHintContainerProps {
    children: React.ReactNode;
    axis?: Axis;
    /** px scrolled on a single click. Default 200. */
    scrollStep?: number;
    className?: string;
    viewportClassName?: string;
}

/* ── Scroll constants ── */
const HOLD_DELAY_MS   = 180;   // ms after mousedown before hold scroll starts
const DOUBLE_CLICK_MS = 320;   // ms window to detect double-click
const HOLD_INITIAL    = 3;     // px/frame on hold start
const HOLD_MAX        = 22;    // px/frame maximum (≈ 1320 px/s @ 60 fps)
const HOLD_ACCEL      = 1.055; // multiplier per frame (exponential ramp)

export function ScrollHintContainer({
    children,
    axis = "vertical",
    scrollStep = 200,
    className,
    viewportClassName,
}: ScrollHintContainerProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [canUp, setCanUp]       = useState(false);
    const [canDown, setCanDown]   = useState(false);
    const [canLeft, setCanLeft]   = useState(false);
    const [canRight, setCanRight] = useState(false);

    const trackV = axis === "vertical"   || axis === "both";
    const trackH = axis === "horizontal" || axis === "both";

    const updateHints = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        if (trackV) {
            const { scrollTop, scrollHeight, clientHeight } = el;
            setCanUp(scrollTop > 4);
            setCanDown(scrollTop + clientHeight < scrollHeight - 4);
        }
        if (trackH) {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            setCanLeft(scrollLeft > 4);
            setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
        }
    }, [trackV, trackH]);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        updateHints();
        el.addEventListener("scroll", updateHints, { passive: true });
        const ro = new ResizeObserver(updateHints);
        ro.observe(el);
        const mo = new MutationObserver(updateHints);
        mo.observe(el, { childList: true, subtree: true });
        return () => {
            el.removeEventListener("scroll", updateHints);
            ro.disconnect();
            mo.disconnect();
        };
    }, [updateHints]);

    const overflowClass =
        axis === "vertical"
            ? "overflow-y-auto overflow-x-hidden"
            : axis === "horizontal"
              ? "overflow-x-auto overflow-y-hidden"
              : "overflow-auto";

    return (
        <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)}>
            <div
                ref={viewportRef}
                className={cn(
                    "flex-1 min-h-0 min-w-0",
                    overflowClass,
                    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                    viewportClassName,
                )}
            >
                {children}
            </div>

            {trackV && (
                <>
                    <ScrollHintButton
                        edge="top"
                        visible={canUp}
                        viewportRef={viewportRef}
                        scrollStep={scrollStep}
                    />
                    <ScrollHintButton
                        edge="bottom"
                        visible={canDown}
                        viewportRef={viewportRef}
                        scrollStep={scrollStep}
                    />
                </>
            )}
            {trackH && (
                <>
                    <ScrollHintButton
                        edge="left"
                        visible={canLeft}
                        viewportRef={viewportRef}
                        scrollStep={scrollStep}
                    />
                    <ScrollHintButton
                        edge="right"
                        visible={canRight}
                        viewportRef={viewportRef}
                        scrollStep={scrollStep}
                    />
                </>
            )}
        </div>
    );
}

// ─── Scroll hint button ────────────────────────────────────────────────────

type Edge = "top" | "bottom" | "left" | "right";

const EDGE_RAIL: Record<Edge, string> = {
    top:    "top-1 left-0 right-0 flex justify-center",
    bottom: "bottom-1 left-0 right-0 flex justify-center",
    left:   "left-1 top-0 bottom-0 flex items-center",
    right:  "right-1 top-0 bottom-0 flex items-center",
};

const EDGE_ICON: Record<Edge, React.ComponentType<{ size?: number; className?: string }>> = {
    top:    ArrowUp,
    bottom: ArrowDown,
    left:   ArrowLeft,
    right:  ArrowRight,
};

const EDGE_LABEL: Record<Edge, string> = {
    top:    "Scroll lên đầu",
    bottom: "Scroll xuống cuối",
    left:   "Scroll sang trái",
    right:  "Scroll sang phải",
};

interface ScrollHintButtonProps {
    edge: Edge;
    visible: boolean;
    viewportRef: React.RefObject<HTMLDivElement | null>;
    scrollStep: number;
}

function ScrollHintButton({ edge, visible, viewportRef, scrollStep }: ScrollHintButtonProps) {
    const Icon = EDGE_ICON[edge];

    const lastClickRef  = useRef(0);
    const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdRafRef    = useRef<number | null>(null);
    const holdSpeedRef  = useRef(HOLD_INITIAL);
    const isHoldingRef  = useRef(false);

    const applyDelta = useCallback((speed: number) => {
        const el = viewportRef.current;
        if (!el) return;
        if (edge === "top")    el.scrollTop  -= speed;
        if (edge === "bottom") el.scrollTop  += speed;
        if (edge === "left")   el.scrollLeft -= speed;
        if (edge === "right")  el.scrollLeft += speed;
    }, [edge, viewportRef]);

    const stopHold = useCallback(() => {
        if (holdTimerRef.current !== null) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        if (holdRafRef.current !== null) {
            cancelAnimationFrame(holdRafRef.current);
            holdRafRef.current = null;
        }
        isHoldingRef.current = false;
    }, []);

    const startHoldScroll = useCallback(() => {
        isHoldingRef.current = true;
        holdSpeedRef.current = HOLD_INITIAL;

        const tick = () => {
            if (!isHoldingRef.current) return;
            applyDelta(holdSpeedRef.current);
            holdSpeedRef.current = Math.min(holdSpeedRef.current * HOLD_ACCEL, HOLD_MAX);
            holdRafRef.current = requestAnimationFrame(tick);
        };
        holdRafRef.current = requestAnimationFrame(tick);
    }, [applyDelta]);

    const scrollToEdge = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        if (edge === "top")    el.scrollTo({ top: 0,                    behavior: "smooth" });
        if (edge === "bottom") el.scrollTo({ top: el.scrollHeight,      behavior: "smooth" });
        if (edge === "left")   el.scrollTo({ left: 0,                   behavior: "smooth" });
        if (edge === "right")  el.scrollTo({ left: el.scrollWidth,      behavior: "smooth" });
    }, [edge, viewportRef]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        holdTimerRef.current = setTimeout(startHoldScroll, HOLD_DELAY_MS);
    }, [startHoldScroll]);

    const handleMouseUp = useCallback(() => {
        const wasHolding = isHoldingRef.current;
        stopHold();

        if (!wasHolding) {
            // Short press → single or double click
            const now = Date.now();
            const since = now - lastClickRef.current;
            lastClickRef.current = now;

            if (since < DOUBLE_CLICK_MS) {
                // Double click → jump to edge
                scrollToEdge();
            } else {
                // Single click → step scroll (smooth)
                const el = viewportRef.current;
                if (!el) return;
                el.scrollBy({
                    top:  (edge === "bottom" ? scrollStep : edge === "top" ? -scrollStep : 0),
                    left: (edge === "right"  ? scrollStep : edge === "left" ? -scrollStep : 0),
                    behavior: "smooth",
                });
            }
        }
    }, [stopHold, scrollToEdge, edge, scrollStep, viewportRef]);

    // Stop hold when pointer leaves the button
    const handleMouseLeave = useCallback(() => {
        stopHold();
    }, [stopHold]);

    // Cleanup on unmount
    useEffect(() => () => stopHold(), [stopHold]);

    return (
        <div
            className={cn(
                "pointer-events-none absolute transition-opacity duration-150",
                EDGE_RAIL[edge],
                visible ? "opacity-100" : "opacity-0",
            )}
        >
            <button
                type="button"
                aria-label={EDGE_LABEL[edge]}
                tabIndex={visible ? 0 : -1}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full",
                    "bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-sm",
                    "hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer select-none",
                    visible ? "pointer-events-auto" : "pointer-events-none",
                )}
            >
                <Icon size={12} />
            </button>
        </div>
    );
}
