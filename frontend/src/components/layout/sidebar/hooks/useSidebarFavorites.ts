import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar:favorites";

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
        // localStorage full / disabled — silent
    }
}

/**
 * Persisted set of "pinned" sidebar item keys. The key is the item's URL
 * (or any other stable id) — using URL keeps state portable when modules
 * are renamed but URLs stay.
 *
 * Syncs across tabs via the `storage` event so pinning in one window
 * updates every other open tab.
 */
export function useSidebarFavorites() {
    const [favorites, setFavorites] = useState<string[]>(() => read());

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            setFavorites(read());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const toggle = useCallback((key: string) => {
        setFavorites((prev) => {
            const next = prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key];
            write(next);
            return next;
        });
    }, []);

    const isFavorite = useCallback(
        (key: string) => favorites.includes(key),
        [favorites],
    );

    const clear = useCallback(() => {
        setFavorites([]);
        write([]);
    }, []);

    return { favorites, isFavorite, toggle, clear };
}
