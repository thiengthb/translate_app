import { useCallback, useEffect, useState } from "react";

import type { ViewMode } from "@/components/datatable/toolbar/DisplayOptionsMenu";

/**
 * Global storage key. Single key (not keyed per-entity) on purpose —
 * the user's view-mode preference is a workflow choice ("I think in
 * cards today"), not entity-specific data. Mirroring the same idiom as
 * theme / color preset / typography settings keeps the mental model
 * consistent.
 *
 * If a future requirement calls for per-entity overrides, the natural
 * extension is `protable:viewMode:<entityName>` with this global key as
 * the fallback for first-time visits.
 */
const STORAGE_KEY = "protable:viewMode";

const VALID_VIEW_MODES: readonly ViewMode[] = ["table", "card", "chart"];
const DEFAULT_VIEW_MODE: ViewMode = "table";

function isValidViewMode(value: string | null): value is ViewMode {
    return value !== null && (VALID_VIEW_MODES as readonly string[]).includes(value);
}

function readStored(): ViewMode {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (isValidViewMode(raw)) return raw;
    } catch {
        // localStorage disabled (private mode / strict cookies) — fall
        // back to default. Silent: throwing here would crash every
        // ProTable mount in those contexts.
    }
    return DEFAULT_VIEW_MODE;
}

/**
 * Persisted view-mode selector for ProTable.
 *
 * Behavior:
 *   - On mount, reads the last-chosen view from localStorage. First-time
 *     visitors land on `"table"` — the densest, lowest-cost rendering.
 *   - On change, writes through to localStorage so the choice survives
 *     reloads AND module navigation (which unmounts/remounts ProTable).
 *   - Cross-tab sync via the `storage` event so opening the same app
 *     in two tabs and changing the view in one updates the other.
 *
 * Returned as a tuple to drop in as a `useState` replacement at the
 * ProTable call-site:
 *
 *   const [viewMode, setViewMode] = useViewMode();
 */
export function useViewMode(): readonly [ViewMode, (next: ViewMode) => void] {
    const [viewMode, setViewModeState] = useState<ViewMode>(() => readStored());

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            if (isValidViewMode(e.newValue)) {
                setViewModeState(e.newValue);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const setViewMode = useCallback((next: ViewMode) => {
        setViewModeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // silent — see note in readStored()
        }
    }, []);

    return [viewMode, setViewMode] as const;
}
