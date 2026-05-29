import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoPageSizeOptions {
    /**
     * Fallback header height in pixels when the actual <thead> can't be
     * measured (e.g. before the table mounts). Default 44 — matches
     * ProTable's `[&_th]:h-11` (Tailwind h-11 = 2.75rem = 44px).
     */
    headerHeight?: number;
    /**
     * Fallback row height in pixels. Default 48 — matches `h-12` from the
     * "normal" density config. The hook also re-measures a real <tr> from
     * the DOM when available, so density changes are picked up automatically.
     */
    rowHeight?: number;
    /** Minimum page size. Default: 5 */
    minSize?: number;
    /** Maximum page size. Default: 100 */
    maxSize?: number;
    /** Callback when page size changes */
    onSizeChange?: (size: number) => void;
}

export function useAutoPageSize(options: UseAutoPageSizeOptions = {}) {
    const {
        headerHeight = 44,
        rowHeight = 48,
        minSize = 5,
        maxSize = 100,
        onSizeChange,
    } = options;

    const containerRef = useRef<HTMLDivElement>(null);
    const [calculatedSize, setCalculatedSize] = useState<number>(10);
    const lastSizeRef = useRef<number>(10);

    const calculatePageSize = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        // Prefer measuring the live DOM so the hook adapts to actual rendered
        // heights — density changes, custom font sizes, padding tweaks, etc.
        const thead = el.querySelector("thead") as HTMLElement | null;
        const measuredHeaderH = thead?.getBoundingClientRect().height ?? 0;
        const effectiveHeaderH =
            measuredHeaderH > 0 ? measuredHeaderH : headerHeight;

        const firstRow = el.querySelector("tbody tr") as HTMLElement | null;
        const measuredRowH = firstRow?.getBoundingClientRect().height ?? 0;
        const effectiveRowH = measuredRowH > 0 ? measuredRowH : rowHeight;

        // clientHeight excludes borders, includes padding — exactly the
        // vertical space available for the table content.
        const containerHeight = el.clientHeight;
        if (containerHeight <= 0 || effectiveRowH <= 0) return;

        const availableHeight = containerHeight - effectiveHeaderH;
        if (availableHeight <= 0) return;

        // 0.5px tolerance absorbs sub-pixel rounding from getBoundingClientRect
        // so a row that *just* fits isn't shaved off by a 0.x px miss.
        const rawSize = Math.floor((availableHeight + 0.5) / effectiveRowH);
        const size = Math.max(minSize, Math.min(maxSize, rawSize));

        if (size !== lastSizeRef.current) {
            lastSizeRef.current = size;
            setCalculatedSize(size);
            onSizeChange?.(size);
        }
    }, [headerHeight, rowHeight, minSize, maxSize, onSizeChange]);

    useEffect(() => {
        // Coalesce bursts of layout/DOM events into a single rAF-aligned
        // measurement so we never thrash during data loads or rapid resizes.
        let raf = 0;
        const scheduleMeasure = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                calculatePageSize();
            });
        };

        scheduleMeasure();

        const resizeObserver = new ResizeObserver(scheduleMeasure);
        // childList only: skips attribute mutations from cell re-renders so
        // we only re-measure on structural changes (skeleton ↔ data, view
        // mode toggle, density class swap on rows).
        const mutationObserver = new MutationObserver(scheduleMeasure);

        const el = containerRef.current;
        if (el) {
            resizeObserver.observe(el);
            mutationObserver.observe(el, { childList: true, subtree: true });
        }

        return () => {
            if (raf) cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [calculatePageSize]);

    return {
        containerRef,
        calculatedSize,
        recalculate: calculatePageSize,
    };
}
