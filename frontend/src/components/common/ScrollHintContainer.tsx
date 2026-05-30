import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Axis = "vertical" | "horizontal" | "both";

interface ScrollHintContainerProps {
    children: React.ReactNode;
    /** Which axes to track / hint. Default "vertical". */
    axis?: Axis;
    /** Smooth-scroll delta (px) per chevron click. Default 200. */
    scrollStep?: number;
    /** Extra classes applied to the outer relative wrapper. */
    className?: string;
    /** Extra classes applied to the inner scrolling viewport. Use this to
     *  layer padding, gap, grid layout, etc. instead of fighting our defaults. */
    viewportClassName?: string;
}

/**
 * A scrolling viewport with **hidden scrollbars** + **floating chevron
 * indicators** that appear only when there's more content in that
 * direction — same affordance as Messenger's "↓ new messages" pill.
 *
 *   ┌─────────────────┐       ┌─────────────────┐
 *   │      ▲          │       │ ◀  content   ▶  │   axis="horizontal"
 *   │  visible item   │       │                 │
 *   │  visible item   │       │                 │
 *   │      ▼          │       └─────────────────┘
 *   └─────────────────┘
 *      axis="vertical"
 *
 * Axes can be combined (`axis="both"`) — used by the data-table viewport
 * where rows overflow vertically and columns overflow horizontally.
 *
 * Implementation notes:
 *   - Watches scroll + ResizeObserver (viewport size) + MutationObserver
 *     (children added/removed) so chevrons appear/disappear without lag.
 *   - 4px epsilon on the scroll math avoids flicker from sub-pixel
 *     scrollbar positions (Safari rounds differently than Chrome).
 *   - `pointer-events-none` on the button wrapper + `pointer-events-auto`
 *     on the button itself so the chevron rail never blocks clicks on
 *     content underneath when it's invisible (opacity-0).
 */
export function ScrollHintContainer({
    children,
    axis = "vertical",
    scrollStep = 200,
    className,
    viewportClassName,
}: ScrollHintContainerProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [canUp, setCanUp] = useState(false);
    const [canDown, setCanDown] = useState(false);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const trackV = axis === "vertical" || axis === "both";
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

    const scrollByDelta = (deltaX: number, deltaY: number) => {
        viewportRef.current?.scrollBy({
            top: deltaY,
            left: deltaX,
            behavior: "smooth",
        });
    };

    // Compose overflow classes per axis so the viewport only scrolls where
    // the caller asked. The triple `[&::-webkit-scrollbar]:hidden` /
    // `scrollbar-width:none` / `-ms-overflow-style:none` together hide
    // the scrollbar across every engine we care about.
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
                        onClick={() => scrollByDelta(0, -scrollStep)}
                    />
                    <ScrollHintButton
                        edge="bottom"
                        visible={canDown}
                        onClick={() => scrollByDelta(0, scrollStep)}
                    />
                </>
            )}
            {trackH && (
                <>
                    <ScrollHintButton
                        edge="left"
                        visible={canLeft}
                        onClick={() => scrollByDelta(-scrollStep, 0)}
                    />
                    <ScrollHintButton
                        edge="right"
                        visible={canRight}
                        onClick={() => scrollByDelta(scrollStep, 0)}
                    />
                </>
            )}
        </div>
    );
}

// ─── Floating chevron button ───────────────────────────────────────────────
type Edge = "top" | "bottom" | "left" | "right";

const EDGE_RAIL: Record<Edge, string> = {
    top: "top-1 left-0 right-0 flex justify-center",
    bottom: "bottom-1 left-0 right-0 flex justify-center",
    left: "left-1 top-0 bottom-0 flex items-center",
    right: "right-1 top-0 bottom-0 flex items-center",
};

const EDGE_ICON: Record<Edge, React.ComponentType<{ size?: number }>> = {
    top: ChevronUp,
    bottom: ChevronDown,
    left: ChevronLeft,
    right: ChevronRight,
};

const EDGE_LABEL: Record<Edge, string> = {
    top: "Scroll up",
    bottom: "Scroll down",
    left: "Scroll left",
    right: "Scroll right",
};

interface ScrollHintButtonProps {
    edge: Edge;
    visible: boolean;
    onClick: () => void;
}

function ScrollHintButton({ edge, visible, onClick }: ScrollHintButtonProps) {
    const Icon = EDGE_ICON[edge];
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
                onClick={onClick}
                aria-label={EDGE_LABEL[edge]}
                tabIndex={visible ? 0 : -1}
                className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full",
                    "bg-background/90 text-foreground shadow-md ring-1 ring-border/60 backdrop-blur",
                    "hover:bg-background hover:scale-105 active:scale-95 transition-all cursor-pointer",
                    // Only intercept clicks while visible — an invisible chevron
                    // must not block the element underneath (e.g. the first
                    // sidebar item when the rail sits at the top edge).
                    visible ? "pointer-events-auto" : "pointer-events-none",
                )}
            >
                <Icon size={13} />
            </button>
        </div>
    );
}
