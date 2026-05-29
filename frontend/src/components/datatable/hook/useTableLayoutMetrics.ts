import { useMemo } from "react";
import type { FieldSchema } from "@/types";
import {
    ACTION_COLUMN_WIDTH,
    DEFAULT_COLUMN_WIDTH,
    EXPAND_COLUMN_WIDTH,
    INDEX_COLUMN_WIDTH,
    SELECT_COLUMN_WIDTH,
} from "../constants";

interface UseTableLayoutMetricsOptions {
    arrangedFields: FieldSchema[];
    columnWidths: Record<string, number>;
    isExpandable: boolean;
    showActionsColumn: boolean;
}

/**
 * Centralised layout math. Three groups of numbers:
 *
 *   - Per-system-column `left` offsets (for sticky positioning)
 *   - `leadingOffset` / `trailingOffset` (passed to useColumnPinning so
 *     user-pinned data columns stack inward from the system columns)
 *   - `totalTableWidth` (sum of all column widths; applied as `min-width`
 *     on the <table> so data columns overflow into horizontal scroll
 *     instead of getting compressed when the viewport is narrow)
 *
 * Returned values are memoised so consumers can use them in dep arrays
 * without thrashing.
 */
export function useTableLayoutMetrics({
    arrangedFields,
    columnWidths,
    isExpandable,
    showActionsColumn,
}: UseTableLayoutMetricsOptions) {
    return useMemo(() => {
        const expandLeft = 0;
        const selectLeft = isExpandable ? EXPAND_COLUMN_WIDTH : 0;
        const indexLeft = selectLeft + SELECT_COLUMN_WIDTH;
        const leadingOffset = indexLeft + INDEX_COLUMN_WIDTH;
        const trailingOffset = showActionsColumn ? ACTION_COLUMN_WIDTH : 0;

        const dataColumnsWidth = arrangedFields.reduce(
            (sum, f) => sum + (columnWidths[f.name] || DEFAULT_COLUMN_WIDTH),
            0,
        );

        const totalTableWidth =
            leadingOffset + dataColumnsWidth + trailingOffset;

        return {
            expandLeft,
            selectLeft,
            indexLeft,
            leadingOffset,
            trailingOffset,
            totalTableWidth,
        };
    }, [arrangedFields, columnWidths, isExpandable, showActionsColumn]);
}
