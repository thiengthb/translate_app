import { useSyncExternalStore } from "react";
import type { KanjiDetailDTO } from "@/types";
import type { QuizType } from "../components/KanjiQuizSettingsDialogs";

/**
 * Resumable study sessions ("Lưu để học tiếp"). When a learner stops a quiz or
 * writing session mid-way they can save it; the saved state is surfaced on the
 * dashboard and in the study-mode picker ("Tiếp tục từ …") and reloaded exactly
 * where they left off.
 *
 * Stored client-side (localStorage) — the backend only persists *finished*
 * sessions (for stats), so the in-progress snapshot lives on the device. A
 * small external store keeps the dashboard + picker in sync after a save/clear.
 */

export type SavedSessionMode = "QUIZ" | "WRITING";

interface SavedOption {
  id: string;
  label: string;
  correct: boolean;
  glyph?: boolean;
}

/** A single quiz question, serialisable so it resumes identically. */
export interface SavedQuizQuestion {
  kanji: KanjiDetailDTO;
  type: QuizType;
  options: SavedOption[];
  onyomiCount?: number;
  kunyomiCount?: number;
  exampleWord?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  exampleType?: string;
  exampleIsSentence?: boolean;
}

interface SavedSessionBase {
  v: 1;
  deckId: number;
  groupIndex: number | null;
  deckTitle?: string | null;
  groupLabel?: string | null;
  /** Index of the next unanswered question / kanji. */
  index: number;
  total: number;
  startedAt: string;
  savedAt: string;
}

export interface SavedQuizSession extends SavedSessionBase {
  mode: "QUIZ";
  type: QuizType;
  questions: SavedQuizQuestion[];
  results: (boolean | null)[];
  elapsed: number;
  /**
   * Revealed-answer state of the saved question, so returning from a
   * kanji-detail trip resumes the *exact* finished question (the learner
   * advances themselves) instead of skipping to the next one. `answered` is the
   * chosen option id (or the resolved sentinel for the reading quiz); `picks`
   * are the tapped readings of the multi-select reading quiz.
   */
  answered?: string | null;
  picks?: string[];
}

export interface SavedWritingSession extends SavedSessionBase {
  mode: "WRITING";
  planIds: number[];
  results: (boolean | null)[];
  tally: { correct: number; wrong: number; hint: number };
  firstTry: Record<number, boolean>;
  /**
   * The "Tạm dừng sau khi trả lời" result panel of the saved kanji, so a return
   * from a detail trip resumes on the same completed character (with its
   * "Tiếp tục" panel) rather than jumping ahead to the next one.
   */
  pause?: { correct: boolean; skipped: boolean } | null;
}

export type SavedSession = SavedQuizSession | SavedWritingSession;

const STORAGE_KEY = "kanji-saved-sessions";

export const sessionKey = (mode: SavedSessionMode, deckId: number | string, groupIndex: number | null) =>
  `${mode}:${deckId}:${groupIndex ?? "all"}`;

type Store = Record<string, SavedSession>;

function read(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

let store: Store = read();
let snapshot: SavedSession[] = Object.values(store);
const listeners = new Set<() => void>();

function commit() {
  snapshot = Object.values(store);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota */
  }
  listeners.forEach((l) => l());
}

export function saveSession(s: SavedSession) {
  store = { ...store, [sessionKey(s.mode, s.deckId, s.groupIndex)]: s };
  commit();
}

export function loadSession(
  mode: SavedSessionMode,
  deckId: number | string,
  groupIndex: number | null
): SavedSession | null {
  return store[sessionKey(mode, deckId, groupIndex)] ?? null;
}

export function clearSession(mode: SavedSessionMode, deckId: number | string, groupIndex: number | null) {
  const key = sessionKey(mode, deckId, groupIndex);
  if (!(key in store)) return;
  const next = { ...store };
  delete next[key];
  store = next;
  commit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** All saved sessions, newest first — for the dashboard "Học tiếp" list. */
export function useSavedSessions(): SavedSession[] {
  const sessions = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return [...sessions].sort((a, b) => (b.savedAt > a.savedAt ? 1 : -1));
}

/** Reactive lookup of one session (for the page resume banner + picker). */
export function useSavedSession(
  mode: SavedSessionMode,
  deckId?: number | string | null,
  groupIndex?: number | null
): SavedSession | null {
  const sessions = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  if (deckId == null) return null;
  const key = sessionKey(mode, deckId, groupIndex ?? null);
  return sessions.find((s) => sessionKey(s.mode, s.deckId, s.groupIndex) === key) ?? null;
}
