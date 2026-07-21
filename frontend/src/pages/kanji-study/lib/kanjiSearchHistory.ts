/**
 * localStorage-backed history for the Kanji Study search screen:
 *  - recent search queries (chips on the empty-query screen),
 *  - recently viewed words/kanji (grouped by day, mirrors the mobile app),
 *  - the last query + tab so reopening the search restores it.
 *
 * Per-key parsing is defensive — corrupt JSON just resets that key.
 */

const QUERIES_KEY = "kanjiStudy.search.recentQueries";
const VIEWED_KEY = "kanjiStudy.search.viewedItems";
const LAST_KEY = "kanjiStudy.search.last";

const MAX_QUERIES = 10;
const MAX_VIEWED = 50;

export type KanjiSearchTab = "words" | "kanji";

export interface ViewedItem {
  type: "word" | "kanji";
  id: number;
  /** Main label — the word text or kanji character. */
  label: string;
  /** Secondary line: reading / meaning. */
  sub?: string;
  /** Epoch ms of the (latest) visit. */
  ts: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / disabled — history is best-effort */
  }
}

// ── Recent queries ─────────────────────────────────────────────────────────

export function getRecentQueries(): string[] {
  const list = read<string[]>(QUERIES_KEY, []);
  return Array.isArray(list) ? list.filter((q) => typeof q === "string" && q.trim() !== "") : [];
}

export function addRecentQuery(query: string): void {
  const q = query.trim();
  if (!q) return;
  const list = [q, ...getRecentQueries().filter((x) => x !== q)].slice(0, MAX_QUERIES);
  write(QUERIES_KEY, list);
}

export function removeRecentQuery(query: string): void {
  write(QUERIES_KEY, getRecentQueries().filter((x) => x !== query));
}

export function clearRecentQueries(): void {
  write(QUERIES_KEY, []);
}

// ── Recently viewed words / kanji ──────────────────────────────────────────

export function getViewedItems(): ViewedItem[] {
  const list = read<ViewedItem[]>(VIEWED_KEY, []);
  return Array.isArray(list)
    ? list.filter((v) => v && typeof v.id === "number" && typeof v.label === "string")
    : [];
}

export function recordViewedItem(item: Omit<ViewedItem, "ts">): void {
  const list = [
    { ...item, ts: Date.now() },
    ...getViewedItems().filter((v) => !(v.type === item.type && v.id === item.id)),
  ].slice(0, MAX_VIEWED);
  write(VIEWED_KEY, list);
}

export function clearViewedItems(): void {
  write(VIEWED_KEY, []);
}

/** Group viewed items by calendar day, newest day first. */
export function groupViewedByDay(items: ViewedItem[]): Array<{ day: Date; items: ViewedItem[] }> {
  const groups = new Map<string, { day: Date; items: ViewedItem[] }>();
  for (const item of items) {
    const d = new Date(item.ts);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) {
      groups.set(key, { day: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) => b.day.getTime() - a.day.getTime());
}

/** "8 tháng 6, 2026" */
export function formatDay(day: Date): string {
  return `${day.getDate()} tháng ${day.getMonth() + 1}, ${day.getFullYear()}`;
}

/** "Hôm nay" / "Hôm qua" / "N ngày trước" */
export function formatDaysAgo(day: Date): string {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((start.getTime() - day.getTime()) / 86_400_000);
  if (diff <= 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return `${diff} ngày trước`;
}

// ── Last search (restored when the page reopens) ───────────────────────────

export function getLastSearch(): { q: string; tab: KanjiSearchTab } {
  const last = read<{ q?: string; tab?: string }>(LAST_KEY, {});
  return {
    q: typeof last.q === "string" ? last.q : "",
    tab: last.tab === "kanji" ? "kanji" : "words",
  };
}

export function saveLastSearch(q: string, tab: KanjiSearchTab): void {
  write(LAST_KEY, { q, tab });
}
