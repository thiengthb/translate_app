import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "sidebar:recent";
const MAX_RECENT = 5;

function read(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
        return [];
    }
}

function write(values: string[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
        // silent
    }
}

interface UseSidebarRecentOptions {
    /** All sidebar item URLs — used to ignore navigation to non-menu routes. */
    knownUrls: Set<string>;
}

/**
 * Tracks the last N visited menu URLs (MRU order). Only routes that match
 * a real sidebar item are recorded — random sub-routes (detail pages,
 * modals, etc.) are skipped so the "Recent" section stays useful.
 *
 * Also exposes `removeItem` (drop one) and `clearAll` (wipe list) so the
 * user can prune entries from the sidebar UI without waiting for them
 * to age out of the MRU window.
 *
 * Syncs across tabs via the `storage` event.
 */
export function useSidebarRecent({ knownUrls }: UseSidebarRecentOptions) {
    const location = useLocation();
    const [recent, setRecent] = useState<string[]>(() => read());

    // ─── Cross-tab sync ─────────────────────────────────────────────────────
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            setRecent(read());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // ─── Track navigation ───────────────────────────────────────────────────
    useEffect(() => {
        // Match the longest known URL the current path starts with — handles
        // both exact matches (`/users`) and nested routes (`/users/123`).
        let match: string | null = null;
        for (const url of knownUrls) {
            if (location.pathname === url || location.pathname.startsWith(`${url}/`)) {
                if (!match || url.length > match.length) match = url;
            }
        }
        if (!match) return;

        setRecent((prev) => {
            const filtered = prev.filter((u) => u !== match);
            const next = [match!, ...filtered].slice(0, MAX_RECENT);
            write(next);
            return next;
        });
    }, [location.pathname, knownUrls]);

    const removeItem = useCallback((url: string) => {
        setRecent((prev) => {
            const next = prev.filter((u) => u !== url);
            write(next);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setRecent([]);
        write([]);
    }, []);

    return { recent, removeItem, clearAll };
}
