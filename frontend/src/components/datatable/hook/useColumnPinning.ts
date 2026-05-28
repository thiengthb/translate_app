import { useMemo } from "react";
import type { PinSide } from "./useColumnLayout";

interface ColumnPinStyleInput {
    arrangedFields: any[];
    leftPinned: Set<string>;
    rightPinned: Set<string>;
    columnWidths: Record<string, number>;
    /** Width of leading utility columns (expand, select, index). */
    leadingOffset: number;
}

interface ColumnPinStyle {
    style: React.CSSProperties;
    className: string;
}

/**
 * Compute sticky positioning styles for pinned columns. Walks left-pinned and
 * right-pinned columns from edges and accumulates left/right offsets so
 * multiple pinned columns stack correctly.
 */
export function useColumnPinning({
    arrangedFields,
    leftPinned,
    rightPinned,
    columnWidths,
    leadingOffset,
}: ColumnPinStyleInput): {
    pinStyles: Record<string, ColumnPinStyle>;
    pinSides: Record<string, PinSide>;
} {
    return useMemo(() => {
        const pinStyles: Record<string, ColumnPinStyle> = {};
        const pinSides: Record<string, PinSide> = {};

        // Left-pinned columns accumulate left offset from leadingOffset onwards.
        let leftOffset = leadingOffset;
        for (const f of arrangedFields) {
            if (!leftPinned.has(f.name)) continue;
            const width = columnWidths[f.name] || 150;
            pinSides[f.name] = "left";
            pinStyles[f.name] = {
                style: { left: leftOffset, position: "sticky" },
                className:
                    "sticky z-20 bg-background shadow-[6px_0_8px_-6px_rgba(0,0,0,0.25)]",
            };
            leftOffset += width;
        }

        // Right-pinned columns accumulate from the right.
        let rightOffset = 0;
        // Walk right-pinned in reverse so the rightmost has offset 0
        const rightPinnedFields = arrangedFields.filter((f) => rightPinned.has(f.name));
        for (let i = rightPinnedFields.length - 1; i >= 0; i--) {
            const f = rightPinnedFields[i];
            const width = columnWidths[f.name] || 150;
            pinSides[f.name] = "right";
            pinStyles[f.name] = {
                style: { right: rightOffset, position: "sticky" },
                className:
                    "sticky z-20 bg-background shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.25)]",
            };
            rightOffset += width;
        }

        return { pinStyles, pinSides };
    }, [arrangedFields, leftPinned, rightPinned, columnWidths, leadingOffset]);
}
