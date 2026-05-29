import { useCallback, useEffect, useMemo, useState } from "react";

export type PinSide = "left" | "right" | null;

interface ColumnLayout {
    order: string[];                              // field name order, left → right
    pinning: Record<string, PinSide>;             // field → pin side
}

const STORAGE_PREFIX = "protable.layout.";

function readLayout(entityName: string): ColumnLayout | null {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${entityName}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed?.order)) return null;
        return {
            order: parsed.order.filter((s: any) => typeof s === "string"),
            pinning: parsed.pinning && typeof parsed.pinning === "object" ? parsed.pinning : {},
        };
    } catch {
        return null;
    }
}

function writeLayout(entityName: string, layout: ColumnLayout): void {
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${entityName}`, JSON.stringify(layout));
    } catch {
        // ignore
    }
}

interface UseColumnLayoutResult {
    /** Fields rearranged by user order + pin (left-pinned first, unpinned middle, right-pinned last). */
    arrangedFields: any[];
    /** Field names currently pinned to each side. */
    leftPinned: Set<string>;
    rightPinned: Set<string>;
    pinning: Record<string, PinSide>;
    setPin: (fieldName: string, side: PinSide) => void;
    reorder: (from: string, to: string) => void;
    reset: () => void;
}

/**
 * Per-entity column layout (order + pinning), persisted to localStorage.
 *
 * Pinning rules:
 *   - left-pinned columns are forced to the start of the visible list
 *   - right-pinned columns are forced to the end
 *   - unpinned columns keep user-defined order between them
 *
 * `arrangedFields` is what ProTable should iterate to render header / cells.
 */
export function useColumnLayout(
    entityName: string,
    visibleFields: any[],
): UseColumnLayoutResult {
    const [layout, setLayout] = useState<ColumnLayout>(
        () => readLayout(entityName) ?? { order: [], pinning: {} },
    );

    useEffect(() => {
        const stored = readLayout(entityName);
        if (stored) setLayout(stored);
        else setLayout({ order: [], pinning: {} });
    }, [entityName]);

    const persist = useCallback(
        (next: ColumnLayout) => {
            setLayout(next);
            writeLayout(entityName, next);
        },
        [entityName],
    );

    const setPin = useCallback(
        (fieldName: string, side: PinSide) => {
            persist({
                ...layout,
                pinning: { ...layout.pinning, [fieldName]: side },
            });
        },
        [layout, persist],
    );

    const reorder = useCallback(
        (from: string, to: string) => {
            if (from === to) return;
            const currentOrder =
                layout.order.length > 0
                    ? [...layout.order]
                    : visibleFields.map((f) => f.name);
            const fromIdx = currentOrder.indexOf(from);
            const toIdx = currentOrder.indexOf(to);
            if (fromIdx === -1 || toIdx === -1) return;
            const next = [...currentOrder];
            next.splice(fromIdx, 1);
            next.splice(toIdx, 0, from);
            persist({ ...layout, order: next });
        },
        [layout, visibleFields, persist],
    );

    const reset = useCallback(() => {
        persist({ order: [], pinning: {} });
    }, [persist]);

    const arrangedFields = useMemo(() => {
        const byName = new Map(visibleFields.map((f) => [f.name, f]));

        // Apply user order first
        let ordered: any[];
        if (layout.order.length > 0) {
            const used = new Set<string>();
            ordered = [];
            for (const name of layout.order) {
                const f = byName.get(name);
                if (f) {
                    ordered.push(f);
                    used.add(name);
                }
            }
            // Append fields not in saved order (newly added fields)
            for (const f of visibleFields) {
                if (!used.has(f.name)) ordered.push(f);
            }
        } else {
            ordered = [...visibleFields];
        }

        // Sort by pin side: left-pinned → unpinned → right-pinned
        const lefts: any[] = [];
        const middles: any[] = [];
        const rights: any[] = [];
        for (const f of ordered) {
            const side = layout.pinning[f.name];
            if (side === "left") lefts.push(f);
            else if (side === "right") rights.push(f);
            else middles.push(f);
        }
        return [...lefts, ...middles, ...rights];
    }, [visibleFields, layout]);

    const leftPinned = useMemo(
        () => new Set(Object.entries(layout.pinning).filter(([, s]) => s === "left").map(([k]) => k)),
        [layout.pinning],
    );
    const rightPinned = useMemo(
        () => new Set(Object.entries(layout.pinning).filter(([, s]) => s === "right").map(([k]) => k)),
        [layout.pinning],
    );

    return {
        arrangedFields,
        leftPinned,
        rightPinned,
        pinning: layout.pinning,
        setPin,
        reorder,
        reset,
    };
}
