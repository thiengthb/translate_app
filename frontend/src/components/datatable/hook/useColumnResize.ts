import { useCallback, useRef, useState } from "react";
import type { FieldSchema } from "@/types";
import {
    DEFAULT_COLUMN_WIDTH,
    DEFAULT_MIN_COLUMN_WIDTH,
} from "../constants";

interface UseColumnResizeOptions {
    fields: FieldSchema[];
}

/**
 * Per-column width state plus a mouse-drag handler for the resize grip.
 * State is seeded from `field.width` so schema-defined widths show on
 * first paint without a layout shift.
 *
 * The resize handler attaches mousemove/mouseup listeners to the document
 * for the duration of a drag — without this, fast pointer movement would
 * "escape" the grip element and stop tracking.
 */
export function useColumnResize({ fields }: UseColumnResizeOptions) {
    const [widths, setWidths] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        for (const f of fields) initial[f.name] = f.width || DEFAULT_COLUMN_WIDTH;
        return initial;
    });

    const resizingRef = useRef<{
        field: string;
        startX: number;
        startWidth: number;
    } | null>(null);

    const onResizeStart = useCallback(
        (fieldName: string, e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startWidth = widths[fieldName] || DEFAULT_COLUMN_WIDTH;
            resizingRef.current = { field: fieldName, startX, startWidth };

            const onMouseMove = (ev: MouseEvent) => {
                if (!resizingRef.current) return;
                const {
                    field,
                    startX: sx,
                    startWidth: sw,
                } = resizingRef.current;
                const diff = ev.clientX - sx;
                const minW =
                    fields.find((f) => f.name === field)?.minWidth ||
                    DEFAULT_MIN_COLUMN_WIDTH;
                const newWidth = Math.max(minW, sw + diff);
                setWidths((prev) => ({ ...prev, [field]: newWidth }));
            };

            const onMouseUp = () => {
                resizingRef.current = null;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.userSelect = "";
            };

            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        },
        [widths, fields],
    );

    return { widths, setWidths, onResizeStart };
}
