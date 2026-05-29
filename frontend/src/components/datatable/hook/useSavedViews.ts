import { useCallback, useEffect, useState } from "react";
import type { SortEntry } from "@/types";

export interface SavedView {
    id: string;
    name: string;
    createdAt: string;
    state: {
        search?: string;
        sortState?: SortEntry[];
        filters?: Record<string, any>;
        columnVisibility?: Record<string, boolean>;
    };
}

const STORAGE_KEY_PREFIX = "protable.views.";

function storageKey(entityName: string): string {
    return `${STORAGE_KEY_PREFIX}${entityName}`;
}

function readViews(entityName: string): SavedView[] {
    try {
        const raw = localStorage.getItem(storageKey(entityName));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeViews(entityName: string, views: SavedView[]): void {
    try {
        localStorage.setItem(storageKey(entityName), JSON.stringify(views));
    } catch {
        // localStorage may be full or disabled — silent
    }
}

interface UseSavedViewsResult {
    views: SavedView[];
    save: (name: string, state: SavedView["state"]) => SavedView;
    remove: (id: string) => void;
    rename: (id: string, newName: string) => void;
}

/**
 * Per-entity saved views, persisted to localStorage. Allows users to keep a
 * favourite filter / sort / column set and re-apply with one click.
 */
export function useSavedViews(entityName: string): UseSavedViewsResult {
    const [views, setViews] = useState<SavedView[]>(() => readViews(entityName));

    // Re-load when entityName changes (different table page)
    useEffect(() => {
        setViews(readViews(entityName));
    }, [entityName]);

    const persist = useCallback(
        (next: SavedView[]) => {
            setViews(next);
            writeViews(entityName, next);
        },
        [entityName],
    );

    const save = useCallback(
        (name: string, state: SavedView["state"]): SavedView => {
            const trimmed = name.trim();
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const view: SavedView = {
                id,
                name: trimmed || "Untitled view",
                createdAt: new Date().toISOString(),
                state,
            };
            persist([...views, view]);
            return view;
        },
        [views, persist],
    );

    const remove = useCallback(
        (id: string) => {
            persist(views.filter((v) => v.id !== id));
        },
        [views, persist],
    );

    const rename = useCallback(
        (id: string, newName: string) => {
            const trimmed = newName.trim();
            if (!trimmed) return;
            persist(views.map((v) => (v.id === id ? { ...v, name: trimmed } : v)));
        },
        [views, persist],
    );

    return { views, save, remove, rename };
}
