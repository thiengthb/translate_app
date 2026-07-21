import { useEffect, useState } from "react";
import {
  kanjiDeckApi,
  kanjiProgressApi,
} from "@/api/features/kanji_study";
import { kanjiApi } from "@/api/features/words/kanji.api";
import type { KanjiDeckDTO, KanjiProgressDTO } from "@/types";
import { getCurrentUserId } from "@/utils/auth.utils";
import {
  emptyProficiencyCounts,
  normalizeProficiency,
  type KanjiProficiency,
} from "../lib/kanjiProficiency";

/** One JLPT (or custom) level row in the progress panel. */
export interface LevelProgress {
  level: string;
  learned: number;
  total: number;
}

/** One day bucket for the forecast / activity charts. */
export interface DayBucket {
  /** ISO yyyy-mm-dd (local). */
  date: string;
  /** Short label like "04 Thu" / "Hôm nay". */
  label: string;
  count: number;
}

export interface KanjiDashboardData {
  isLoading: boolean;
  decks: KanjiDeckDTO[];
  /** Deck surfaced on the "study by deck" card (most recent, else first). */
  featuredDeck?: KanjiDeckDTO;
  /** How many studied kanji sit at each proficiency level. */
  proficiencyCounts: Record<KanjiProficiency, number>;
  totalLearned: number;
  /** SRS items whose nextReviewAt has passed (due now). */
  dueCount: number;
  levels: LevelProgress[];
  forecast: DayBucket[];
  activity: DayBucket[];
}

const LEVEL_ORDER = [
  "SC1", "SC2", "SC3", "SC4", "SC5", "SC6",
  "TC1", "TC2", "TC3", "NC",
  "N5", "N4", "N3", "N2", "N1",
];

/** Local yyyy-mm-dd key (avoids UTC off-by-one from toISOString). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Build N forward day buckets starting at `start` (offset 0 = today). */
function buildForecastBuckets(start: Date, days: number): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const label =
      i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : `${String(d.getDate()).padStart(2, "0")} ${WEEKDAYS[d.getDay()]}`;
    map.set(dayKey(d), { date: dayKey(d), label, count: 0 });
  }
  return map;
}

/**
 * Loads everything the Kanji dashboard renders: the user's decks, SRS
 * progress, and the derived forecast / activity / per-level breakdowns.
 *
 * Everything degrades to an empty state when the DB isn't seeded yet —
 * no throw, just zeros and empty arrays.
 */
export function useKanjiDashboard(): KanjiDashboardData {
  const userId = getCurrentUserId();
  const [data, setData] = useState<KanjiDashboardData>({
    isLoading: true,
    decks: [],
    proficiencyCounts: emptyProficiencyCounts(),
    totalLearned: 0,
    dueCount: 0,
    levels: [],
    forecast: [],
    activity: [],
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [decks, progress] = await Promise.all([
        kanjiDeckApi
          .getPage({ page: 0, size: 200 })
          .then((r) => (r.content ?? []) as KanjiDeckDTO[])
          .catch(() => [] as KanjiDeckDTO[]),
        kanjiProgressApi
          .getPage({ page: 0, size: 1000 }, undefined, (userId ? { userId } : {}) as never)
          .then((r) => (r.content ?? []) as KanjiProgressDTO[])
          .catch(() => [] as KanjiProgressDTO[]),
      ]);

      // ── Proficiency breakdown (the 5 "Tiến độ" levels) ─────────────────
      const proficiencyCounts = emptyProficiencyCounts();
      for (const p of progress) {
        proficiencyCounts[normalizeProficiency(p.status)]++;
      }
      // "Learned" = studied and at least "Đã biết" (i.e. not still "Chưa biết").
      const totalLearned = progress.length - proficiencyCounts.NEW;

      // ── SRS due now ────────────────────────────────────────────────────
      const now = Date.now();
      const dueCount = progress.filter(
        (p) => p.nextReviewAt && new Date(p.nextReviewAt).getTime() <= now
      ).length;

      // ── Forecast (next 7 days, by nextReviewAt) ────────────────────────
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const forecastMap = buildForecastBuckets(today, 7);
      for (const p of progress) {
        if (!p.nextReviewAt) continue;
        const k = dayKey(new Date(p.nextReviewAt));
        const b = forecastMap.get(k);
        if (b) b.count++;
      }

      // ── Activity (past 14 days, by lastStudiedAt) ──────────────────────
      const activityStart = new Date(today);
      activityStart.setDate(today.getDate() - 13);
      const activityMap = new Map<string, DayBucket>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(activityStart);
        d.setDate(activityStart.getDate() + i);
        activityMap.set(dayKey(d), {
          date: dayKey(d),
          label: `${String(d.getDate()).padStart(2, "0")} ${WEEKDAYS[d.getDay()]}`,
          count: 0,
        });
      }
      for (const p of progress) {
        if (!p.lastStudiedAt) continue;
        const b = activityMap.get(dayKey(new Date(p.lastStudiedAt)));
        if (b) b.count++;
      }

      // ── Per-level progress ─────────────────────────────────────────────
      // Totals come from the decks the user provides (grouped by jlptLevel).
      // Learned-per-level is a best-effort lookup of the level of each
      // already-studied kanji (bounded by #learned, so 0 cost early on).
      const totalByLevel = new Map<string, number>();
      for (const d of decks) {
        const lv = (d.jlptLevel ?? "").trim();
        if (!lv) continue;
        totalByLevel.set(lv, (totalByLevel.get(lv) ?? 0) + (d.totalKanji ?? 0));
      }

      const learnedByLevel = new Map<string, number>();
      const learnedIds = Array.from(
        new Set(
          progress
            .filter((p) => normalizeProficiency(p.status) !== "NEW")
            .map((p) => p.kanjiId)
            .filter((x): x is number => x != null)
        )
      ).slice(0, 400);
      if (learnedIds.length > 0) {
        const kanjis = await Promise.all(
          learnedIds.map((id) => kanjiApi.getById(String(id)).catch(() => null))
        );
        for (const k of kanjis) {
          const lv = (k?.jlptLevel ?? "").trim();
          if (!lv) continue;
          learnedByLevel.set(lv, (learnedByLevel.get(lv) ?? 0) + 1);
        }
      }

      const levelKeys = Array.from(
        new Set([...totalByLevel.keys(), ...learnedByLevel.keys()])
      ).sort((a, b) => {
        const ia = LEVEL_ORDER.indexOf(a);
        const ib = LEVEL_ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });
      const levels: LevelProgress[] = levelKeys.map((level) => ({
        level,
        learned: learnedByLevel.get(level) ?? 0,
        total: totalByLevel.get(level) ?? 0,
      }));

      // Featured deck = most recently created of the user's own decks,
      // else the first system deck.
      const own = decks.filter((d) => !d.isSystem);
      const featuredDeck = own[0] ?? decks[0];

      if (cancelled) return;
      setData({
        isLoading: false,
        decks,
        featuredDeck,
        proficiencyCounts,
        totalLearned,
        dueCount,
        levels,
        forecast: Array.from(forecastMap.values()),
        activity: Array.from(activityMap.values()),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return data;
}
