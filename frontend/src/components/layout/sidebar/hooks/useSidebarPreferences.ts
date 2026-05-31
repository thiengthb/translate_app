import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar:preferences";

/**
 * User-toggleable sidebar features. Each flag gates whether the matching
 * section renders in the sidebar body:
 *   - showRecent → the "Recent" (MRU) section
 *   - showPinned → the "Pinned" (favorites) section
 *
 * Both default to ON so first-time users get the full experience; the
 * footer settings let them turn either off.
 */
export interface SidebarPreferences {
    showRecent: boolean;
    showPinned: boolean;
}

const DEFAULTS: SidebarPreferences = {
    showRecent: true,
    showPinned: true,
};

function read(): SidebarPreferences {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULTS;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return DEFAULTS;
        return {
            showRecent:
                typeof parsed.showRecent === "boolean"
                    ? parsed.showRecent
                    : DEFAULTS.showRecent,
            showPinned:
                typeof parsed.showPinned === "boolean"
                    ? parsed.showPinned
                    : DEFAULTS.showPinned,
        };
    } catch {
        return DEFAULTS;
    }
}

function write(prefs: SidebarPreferences): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // localStorage full / disabled — silent
    }
}

/**
 * Persisted sidebar feature preferences. Mirrors the pattern used by
 * `useSidebarFavorites` / `useSidebarRecent`: localStorage-backed with
 * cross-tab sync via the `storage` event, so toggling a switch in one
 * window updates every other open tab.
 */
export function useSidebarPreferences() {
    const [prefs, setPrefs] = useState<SidebarPreferences>(() => read());

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            setPrefs(read());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const setPreference = useCallback(
        <K extends keyof SidebarPreferences>(
            key: K,
            value: SidebarPreferences[K],
        ) => {
            setPrefs((prev) => {
                const next = { ...prev, [key]: value };
                write(next);
                return next;
            });
        },
        [],
    );

    return { preferences: prefs, setPreference };
}
