import { useSyncExternalStore } from "react";

/**
 * Global on/off preference for furigana (ruby readings), persisted in localStorage.
 * Backed by useSyncExternalStore so every <JpText> across the app re-renders in
 * lockstep when toggled — same tab (via the listener set) and across tabs (via the
 * `storage` event). Defaults to ON.
 */
const KEY = "grammarFurigana";
const listeners = new Set<() => void>();

function read(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) !== "off"; // default ON
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setFuriganaEnabled(enabled: boolean): void {
  localStorage.setItem(KEY, enabled ? "on" : "off");
  listeners.forEach((l) => l()); // notify same-tab subscribers (storage event won't)
}

export function useFuriganaEnabled() {
  const enabled = useSyncExternalStore(subscribe, read, () => true);
  return { enabled, toggle: () => setFuriganaEnabled(!read()) };
}
