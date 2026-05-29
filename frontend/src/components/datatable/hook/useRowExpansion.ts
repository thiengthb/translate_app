import { useCallback, useState } from "react";

/**
 * Per-row expand/collapse state. Returns a Set so consumers can lookup
 * in O(1) (`expanded.has(id)`) and a stable toggle handler that
 * stopPropagation's the click so it doesn't bubble to row-click.
 */
export function useRowExpansion() {
    const [expanded, setExpanded] = useState<Set<string | number>>(new Set());

    const toggle = useCallback((id: string | number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    return { expanded, toggle, setExpanded };
}
