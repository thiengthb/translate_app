import { useSyncExternalStore } from "react";
import { logger } from "@/lib/logger";

/**
 * Kanji clipboard — chọn kanji trong một deck rồi sao chép/di chuyển sang deck
 * khác (mirrors the mobile Kanji Study app's select → copy/cut → paste flow).
 *
 * Persisted in localStorage so the selection survives navigating between the
 * source deck and the target deck (different pages/mounts).
 */

export interface KanjiClipboardEntry {
  /** Kanji detail id. */
  id: number;
  /** Glyph for previews ("一", "百"…). */
  character?: string;
}

export interface KanjiClipboard {
  mode: "copy" | "move";
  /** Deck the kanji were taken from — needed to remove them after a "move" paste. */
  sourceDeckId: number | null;
  sourceDeckTitle?: string;
  items: KanjiClipboardEntry[];
  at: number;
}

const KEY = "kanji-study.clipboard";
const EVENT = "kanji-clipboard-change";

let cache: KanjiClipboard | null = null;
let cacheRaw: string | null = null;

function read(): KanjiClipboard | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw) return cache; // stable reference for useSyncExternalStore
    cacheRaw = raw;
    cache = raw ? (JSON.parse(raw) as KanjiClipboard) : null;
    return cache;
  } catch (e) {
    logger.warn("kanjiClipboard: failed to parse", e);
    return null;
  }
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

export function setKanjiClipboard(clipboard: Omit<KanjiClipboard, "at">) {
  localStorage.setItem(KEY, JSON.stringify({ ...clipboard, at: Date.now() }));
  notify();
}

export function clearKanjiClipboard() {
  localStorage.removeItem(KEY);
  notify();
}

export function getKanjiClipboard(): KanjiClipboard | null {
  return read();
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // cross-tab
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Reactive clipboard — re-renders when any page copies/cuts/clears. */
export function useKanjiClipboard(): KanjiClipboard | null {
  return useSyncExternalStore(subscribe, read);
}
