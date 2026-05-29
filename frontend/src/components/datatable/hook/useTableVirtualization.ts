import { useVirtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

interface Options {
    enabled: boolean;
    count: number;
    rowHeight: number;
    scrollRef: RefObject<HTMLElement | null>;
    overscan?: number;
}

/**
 * Wrap @tanstack/react-virtual for ProTable. When disabled, returns a stub
 * that renders all rows like before — caller doesn't need branching logic.
 */
export function useTableVirtualization({
    enabled,
    count,
    rowHeight,
    scrollRef,
    overscan = 8,
}: Options) {
    const virtualizer = useVirtualizer({
        count: enabled ? count : 0,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => rowHeight,
        overscan,
    });

    if (!enabled) {
        return {
            enabled: false as const,
            virtualItems: [],
            totalSize: 0,
            paddingTop: 0,
            paddingBottom: 0,
        };
    }

    const virtualItems = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom =
        virtualItems.length > 0
            ? totalSize - virtualItems[virtualItems.length - 1].end
            : 0;

    return {
        enabled: true as const,
        virtualItems,
        totalSize,
        paddingTop,
        paddingBottom,
    };
}
