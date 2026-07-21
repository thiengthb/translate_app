import { useMemo, useSyncExternalStore } from "react";

/**
 * Client-side "Ưa thích" (favorites) for kanji — a localStorage set of kanji
 * ids, toggled by the star button in the study runners. There is no backend
 * favorites table yet, so this lives entirely on the device; the study scope
 * dialog's "Chỉ yêu thích" filter reads from it.
 *
 * A tiny external store (not React state) so a star toggled in one place is
 * reflected everywhere via {@link useKanjiFavorites}.
 */

const STORAGE_KEY = "kanji-favorites";

function load(): Set<number> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(arr.filter((n) => typeof n === "number"));
  } catch {
    return new Set();
  }
}

let favorites = load();
let snapshot: number[] = [...favorites]; // stable identity for useSyncExternalStore
const listeners = new Set<() => void>();

function emit() {
  snapshot = [...favorites];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* private mode / quota — just won't persist */
  }
  listeners.forEach((l) => l());
}

export function toggleFavorite(id: number) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  emit();
}

export function isFavorite(id?: number | null): boolean {
  return id != null && favorites.has(id);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Reactive favorites — re-renders when any star is toggled, anywhere. */
export function useKanjiFavorites() {
  const ids = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  const set = useMemo(() => new Set(ids), [ids]);
  return {
    favorites: set,
    count: set.size,
    isFavorite: (id?: number | null) => id != null && set.has(id),
    toggle: toggleFavorite,
  };
}
