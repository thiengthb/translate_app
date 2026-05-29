import { useCallback, useState } from "react";

const STORAGE_KEY = "sidebar-groups-open";

function readMap(): Record<string, boolean> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeMap(map: Record<string, boolean>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // silent
    }
}

/**
 * Per-group collapse state, persisted to localStorage so the user's
 * preferred layout survives reloads. Groups default to OPEN if no entry
 * is found — first-time users see everything.
 *
 * Note: previously this lived inline in NavMain with one `useState` per
 * group, which meant the read+write happened during render. Hoisting to
 * a single map lets the component tree stay declarative.
 */
export function useGroupCollapseState() {
    const [map, setMap] = useState<Record<string, boolean>>(() => readMap());

    const isOpen = useCallback(
        (title: string): boolean => (title in map ? map[title] : true),
        [map],
    );

    const setOpen = useCallback((title: string, open: boolean) => {
        setMap((prev) => {
            const next = { ...prev, [title]: open };
            writeMap(next);
            return next;
        });
    }, []);

    /**
     * Bulk-set a list of group titles to the same open/closed state. Used
     * by the sidebar's "expand all / collapse all" toolbar buttons — one
     * write per click instead of one per group.
     */
    const setAll = useCallback((titles: string[], open: boolean) => {
        setMap((prev) => {
            const next = { ...prev };
            for (const title of titles) next[title] = open;
            writeMap(next);
            return next;
        });
    }, []);

    return { isOpen, setOpen, setAll };
}
