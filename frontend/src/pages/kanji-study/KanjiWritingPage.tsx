import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, Clock, FileText, Pause, PenLine, Play, RotateCcw,
  Settings2, SlidersHorizontal, Target, X,
} from "lucide-react";
import {
  kanjiDeckApi, kanjiProgressApi, kanjiReadingApi, kanjiStudyApi,
} from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiProgressDTO, KanjiReadingDTO } from "@/types";
import type { KanjiVocabWord } from "@/types/features/kanji_study";
import { getCurrentUserId } from "@/utils/auth.utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { KanjiLayout } from "./components/KanjiLayout";
import { useDeckKanji } from "./hooks/useDeckKanji";
import { useWritingSettings, type QuizOrder, type WritingSettings } from "./hooks/useWritingSettings";
import { KanjiWritingCanvas, type WritingOutcome } from "./components/KanjiWritingCanvas";
import { WritingContentDialog, WritingSettingsDialog } from "./components/KanjiWritingSettingsDialogs";
import { KanjiStudyScopeDialog, applyScope } from "./components/KanjiStudyScopeDialog";
import { KanjiReadingExamplesPanel } from "./components/KanjiReadingExamplesPanel";
import { useKanjiFavorites } from "./lib/kanjiFavorites";
import {
  clearSession, loadSession, saveSession, useSavedSession, type SavedWritingSession,
} from "./lib/kanjiSession";

/**
 * Luyện viết — the handwriting study mode ("Thông tin → Viết chữ").
 *
 * Setup mirrors the mobile app: stats header, the content-display sheet and
 * the settings sheet (Chỉnh nét, Hiện gợi ý, Hypermode…), then a question
 * count. Playing shows the kanji's readings/meaning and the
 * {@link KanjiWritingCanvas}; each character is drawn stroke-by-stroke with
 * live recognition. Results reuse the quiz layout and persist the session as
 * `mode=WRITING` (so progress + the "Viết" stat update like Trắc nghiệm).
 */

const meaningOf = (k: KanjiDetailDTO) => (k.meaningVi || k.meaning || "").trim();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readingTokens(raw?: string): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[、,，/・\s]+/).map((t) => t.trim()).filter(Boolean))];
}

function formatLastStudied(iso?: string | null): string {
  if (!iso) return "Chưa học";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function speakReadings(k?: KanjiDetailDTO) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const text = [k?.onyomi, k?.kunyomi].filter(Boolean).join("、");
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* TTS unavailable — silently skip */
  }
}

const ORDER_SUMMARY: Record<QuizOrder, string> = {
  ACCURACY: "Theo độ chính xác",
  RANDOM: "Ngẫu nhiên",
  SEQUENTIAL: "Theo thứ tự",
};

function contentSummary(s: WritingSettings): string {
  const parts: string[] = [];
  if (s.showOnyomi || s.showKunyomi || s.showExtraReadings) parts.push("Phát âm");
  if (s.showMeaning) parts.push("Ý nghĩa");
  if (s.showNotes) parts.push("Ghi chú");
  return parts.length ? parts.join(", ") : "Không hiển thị gì";
}

function settingsSummary(s: WritingSettings): string {
  const parts: string[] = [];
  if (s.pauseAfterAnswer) parts.push("Tạm dừng sau khi trả lời");
  parts.push(ORDER_SUMMARY[s.order]);
  if (s.showHint) parts.push("Hiện gợi ý");
  if (s.redoUntilPerfect) parts.push("Làm lại đến khi hoàn hảo");
  if (s.hypermode) parts.push("Hypermode");
  return parts.join(", ");
}

function scopeSummary(count: number, s: WritingSettings): string {
  const parts = [`${count} kanji`];
  if (s.accuracyMax < 100) parts.push(`≤ ${s.accuracyMax}%`);
  if (s.onlyFavorites) parts.push("Ưa thích");
  return parts.join(" · ");
}

/** Did the browser just reload this page (vs. a fresh in-app navigation)? */
function wasReloaded(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

interface PauseInfo {
  kanji: KanjiDetailDTO;
  correct: boolean;
  skipped: boolean;
  next: number;
}

export default function KanjiWritingPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [params] = useSearchParams();
  const groupParam = params.get("group");
  const groupIndex = groupParam != null && groupParam !== "" ? Number(groupParam) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { settings, update, toggle } = useWritingSettings();
  const { favorites, isFavorite, toggle: toggleFavorite } = useKanjiFavorites();
  const savedSession = useSavedSession("WRITING", deckId, groupIndex);

  const { data: deck } = useQuery({
    queryKey: ["kanji-deck", deckId],
    enabled: !!deckId,
    queryFn: () => kanjiDeckApi.getById(deckId!),
  });
  const { data: stats } = useQuery({
    queryKey: ["kanji-write-stats", deckId, groupIndex],
    enabled: !!deckId,
    queryFn: () => kanjiStudyApi.stats(Number(deckId), groupIndex, "WRITING"),
  });
  const { kanji: deckKanji, isLoading } = useDeckKanji(deckId);

  // Per-kanji accuracy (for the "Theo độ chính xác" order). Scoped to the user.
  const userId = getCurrentUserId();
  const { data: accMap } = useQuery({
    queryKey: ["kanji-accuracy", userId],
    enabled: userId != null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await kanjiProgressApi.getPage({ page: 0, size: 2000 }, undefined, { userId } as never);
      const list = (res.content ?? (res as any).items ?? []) as KanjiProgressDTO[];
      const m = new Map<number, number>();
      for (const p of list) {
        if (p.kanjiId == null) continue;
        const c = p.correctCount ?? 0;
        const w = p.wrongCount ?? 0;
        m.set(p.kanjiId, c + w > 0 ? c / (c + w) : 0);
      }
      return m;
    },
  });

  const subjects = useMemo(
    () =>
      (groupIndex == null ? deckKanji : deckKanji.filter((k) => k.groupIndex === groupIndex)).map((k) => k.kanji),
    [deckKanji, groupIndex]
  );

  // The actual study set after the review scope (accuracy + favorites).
  const scoped = useMemo(
    () => applyScope(subjects, accMap, favorites, settings.accuracyMax, settings.onlyFavorites),
    [subjects, accMap, favorites, settings.accuracyMax, settings.onlyFavorites]
  );

  const groupLabel = useMemo(() => {
    if (groupIndex == null) return null;
    const order: number[] = [];
    for (const k of deckKanji) if (!order.includes(k.groupIndex)) order.push(k.groupIndex);
    const pos = order.indexOf(groupIndex);
    return pos >= 0 ? `Nhóm ${pos + 1}` : null;
  }, [deckKanji, groupIndex]);

  /* ── phase + dialogs ─────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<"setup" | "playing" | "results">("setup");
  const [dialog, setDialog] = useState<"content" | "settings" | "scope" | null>(null);

  /* ── playing state (refs mirror state so handlers read fresh values) ──── */
  const planRef = useRef<KanjiDetailDTO[]>([]);
  const [plan, setPlanState] = useState<KanjiDetailDTO[]>([]);
  const indexRef = useRef(0);
  const [index, setIndexState] = useState(0);
  const firstTry = useRef<Record<number, boolean>>({});
  const [attempt, setAttempt] = useState(0); // bump → canvas remount (new kanji / retry)
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [tally, setTally] = useState({ correct: 0, wrong: 0, hint: 0 });
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pauseInfo, setPauseInfo] = useState<PauseInfo | null>(null);
  const [paused, setPaused] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const [saved, setSaved] = useState(false);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const submittedRef = useRef(false);

  const cur = plan[index];

  /* ── ordering + start ────────────────────────────────────────────────── */

  const orderSubjects = useCallback(
    (subs: KanjiDetailDTO[]): KanjiDetailDTO[] => {
      if (settings.order === "RANDOM") return shuffle(subs);
      if (settings.order === "SEQUENTIAL") return subs;
      const accOf = (k: KanjiDetailDTO) => (k.id != null && accMap?.has(k.id) ? accMap.get(k.id)! : -1);
      return [...subs].sort((a, b) => accOf(a) - accOf(b));
    },
    [settings.order, accMap]
  );

  const start = () => {
    const picked = orderSubjects(scoped);
    if (picked.length === 0) return;
    clearSession("WRITING", Number(deckId), groupIndex); // a fresh run supersedes any saved one
    planRef.current = picked;
    setPlanState(picked);
    indexRef.current = 0;
    setIndexState(0);
    firstTry.current = {};
    setResults([]);
    setTally({ correct: 0, wrong: 0, hint: 0 });
    setRemaining(null);
    setAttempt((a) => a + 1);
    setPauseInfo(null);
    setPaused(false);
    setShowExamples(false);
    setSaved(false);
    submittedRef.current = false;
    startedAtRef.current = new Date().toISOString();
    setPhase("playing");
  };

  const buildSnapshot = useCallback((): SavedWritingSession => {
    const planList = planRef.current;
    return {
      v: 1,
      mode: "WRITING",
      deckId: Number(deckId),
      groupIndex,
      deckTitle: deck?.title,
      groupLabel,
      planIds: planList.map((k) => k.id).filter((id): id is number => id != null),
      results: planList.map((_, i) => (results[i] == null ? null : results[i])),
      tally,
      firstTry: { ...firstTry.current },
      index: indexRef.current,
      total: planList.length,
      startedAt: startedAtRef.current,
      savedAt: new Date().toISOString(),
      pause: pauseInfo ? { correct: pauseInfo.correct, skipped: pauseInfo.skipped } : null,
    };
  }, [deckId, groupIndex, deck?.title, groupLabel, results, tally, pauseInfo]);

  const resume = useCallback(
    (s: SavedWritingSession) => {
      const map = new Map(deckKanji.map((d) => [d.kanji.id, d.kanji] as const));
      const picked = s.planIds.map((id) => map.get(id)).filter((k): k is KanjiDetailDTO => k != null);
      if (picked.length === 0) return;
      planRef.current = picked;
      setPlanState(picked);
      // Land on the EXACT saved kanji (no auto-skip) so a return from a detail
      // trip resumes the same — possibly completed — character; the learner taps
      // "Tiếp tục" themselves.
      const i = Math.min(Math.max(s.index, 0), picked.length - 1);
      indexRef.current = i;
      setIndexState(i);
      firstTry.current = { ...s.firstTry };
      setResults(s.results);
      setTally(s.tally);
      setRemaining(null);
      setAttempt((a) => a + 1);
      // Restore the "Tạm dừng sau khi trả lời" result panel if this kanji was
      // already completed, so the learner advances themselves.
      if (settings.pauseAfterAnswer && s.pause && s.results[i] != null) {
        setPauseInfo({ kanji: picked[i], correct: s.pause.correct, skipped: s.pause.skipped, next: i + 1 });
      } else {
        setPauseInfo(null);
      }
      setPaused(false);
      setShowExamples(false);
      setSaved(false);
      submittedRef.current = false;
      startedAtRef.current = s.startedAt;
      setPhase("playing");
    },
    [deckKanji, settings.pauseAfterAnswer]
  );

  const saveAndExit = () => {
    if (planRef.current.length > 0) saveSession(buildSnapshot());
    navigate(`/kanji-study/deck/${deckId}`);
  };

  const openKanjiInfo = (kid?: number | null) => {
    if (kid == null) return;
    if (planRef.current.length > 0) saveSession(buildSnapshot());
    const g = groupIndex != null ? `&group=${groupIndex}` : "";
    navigate(`/kanji-study/kanji/${kid}?deck=${deckId}&focus=1&from=writing${g}`);
  };

  const openWordInfo = (word: KanjiVocabWord) => {
    if (planRef.current.length > 0) saveSession(buildSnapshot());
    const g = groupIndex != null ? `&group=${groupIndex}` : "";
    navigate(`/kanji-study/word/${word.id}?focus=1&from=writing&deck=${deckId}${g}`);
  };

  /* ── canvas callbacks ────────────────────────────────────────────────── */

  const onStroke = useCallback((kind: "correct" | "wrong" | "hint") => {
    setTally((t) => ({
      correct: t.correct + (kind === "correct" ? 1 : 0),
      wrong: t.wrong + (kind === "wrong" ? 1 : 0),
      hint: t.hint + (kind === "hint" ? 1 : 0),
    }));
  }, []);

  const onProgress = useCallback((done: number, total: number) => {
    setRemaining(total > 0 ? total - done : null);
  }, []);

  const advanceTo = useCallback((nextIndex: number) => {
    setPauseInfo(null);
    if (nextIndex >= planRef.current.length) {
      setPhase("results");
      return;
    }
    indexRef.current = nextIndex;
    setIndexState(nextIndex);
    setRemaining(null);
    setShowExamples(false);
    setAttempt((a) => a + 1);
  }, []);

  const onComplete = useCallback(
    (o: WritingOutcome) => {
      const i = indexRef.current;
      if (firstTry.current[i] === undefined) firstTry.current[i] = o.passed && !o.skipped;

      // "Làm lại đến khi hoàn hảo": redo this kanji until it's drawn cleanly.
      if (settings.redoUntilPerfect && !o.skipped && !o.passed) {
        setAttempt((a) => a + 1);
        return;
      }

      const correct = !!firstTry.current[i] && !o.skipped;
      setResults((r) => {
        const n = [...r];
        n[i] = correct;
        return n;
      });

      // "Thêm câu hỏi khi trả lời sai": re-queue the missed kanji at the end.
      if (!correct && settings.repeatOnWrong) {
        planRef.current = [...planRef.current, planRef.current[i]];
        setPlanState(planRef.current);
      }

      const next = i + 1;
      if (settings.pauseAfterAnswer) {
        setPauseInfo({ kanji: planRef.current[i], correct, skipped: o.skipped, next });
      } else {
        advanceTo(next);
      }
    },
    [settings.redoUntilPerfect, settings.repeatOnWrong, settings.pauseAfterAnswer, advanceTo]
  );

  /* ── side effects: TTS + session save + resume ───────────────────────── */

  useEffect(() => {
    if (phase !== "playing" || !settings.playReadingAudio) return;
    speakReadings(planRef.current[index]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, attempt, settings.playReadingAudio]);

  // Autosave the live session so a refresh / kanji-detail trip resumes here.
  useEffect(() => {
    if (phase !== "playing" || planRef.current.length === 0) return;
    saveSession(buildSnapshot());
  }, [phase, index, results, buildSnapshot]);

  // Auto-resume on a browser refresh or a return from a kanji-detail trip.
  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (autoResumedRef.current || phase !== "setup" || deckKanji.length === 0) return;
    const wantResume = params.get("resume") === "1" || wasReloaded();
    if (!wantResume) return;
    const s = loadSession("WRITING", Number(deckId), groupIndex);
    if (s && s.mode === "WRITING" && s.planIds.length > 0) {
      autoResumedRef.current = true;
      resume(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deckKanji, deckId, groupIndex]);

  useEffect(() => {
    if (phase !== "results" || submittedRef.current) return;
    submittedRef.current = true;
    clearSession("WRITING", Number(deckId), groupIndex); // session is done
    const seen = new Map<number, boolean>();
    planRef.current.forEach((k, i) => {
      if (k.id == null || results[i] == null) return; // only answered kanji
      seen.set(k.id, results[i] === true); // last occurrence wins
    });
    const items = [...seen].map(([kanjiId, correct]) => ({ kanjiId, correct }));
    if (items.length === 0) return;
    kanjiStudyApi
      .submit({ deckId: Number(deckId), groupIndex, mode: "WRITING", startedAt: startedAtRef.current, items })
      .then(() => {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: ["kanji-write-stats", deckId, groupIndex] });
        queryClient.invalidateQueries({ queryKey: ["kanji-recent-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["kanji-accuracy", userId] });
      })
      .catch((e) => logger.error("writing submit failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── current-kanji info (readings + examples), respecting Hypermode ───── */

  const infoHidden = settings.hypermode;
  const { data: hanViet } = useQuery({
    queryKey: ["kanji-readings", cur?.id],
    enabled: cur?.id != null && settings.showExtraReadings && !infoHidden,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await kanjiReadingApi.getPage({ page: 0, size: 50 }, undefined, { kanjiId: cur!.id } as never);
      const list = (res.content ?? (res as any).items ?? []) as KanjiReadingDTO[];
      return list
        .filter((r) => r.readingType === "HAN_VIET")
        .map((r) => r.value)
        .filter(Boolean)
        .join("、");
    },
  });

  /* ── render: loading ─────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <KanjiLayout pageScroll>
        <p className="mx-auto max-w-2xl text-muted-foreground">Đang tải...</p>
      </KanjiLayout>
    );
  }

  /* ── render: setup ───────────────────────────────────────────────────── */

  if (phase === "setup") {
    return (
      <KanjiLayout pageScroll>
        <div className="mx-auto w-full max-w-2xl pb-10">
          <button
            onClick={() => navigate(`/kanji-study/deck/${deckId}`)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> {deck?.title ?? "Deck"}
            {groupLabel ? ` · ${groupLabel}` : ""}
          </button>

          <h1 className="mb-1 text-2xl font-bold text-foreground">Luyện viết</h1>
          <p className="mb-5 text-muted-foreground">
            {subjects.length} Hán tự{groupLabel ? ` · ${groupLabel}` : ""}
          </p>

          {savedSession && savedSession.mode === "WRITING" && (
            <button
              onClick={() => savedSession.mode === "WRITING" && resume(savedSession)}
              className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-teal-400/60 bg-teal-500/10 px-4 py-3.5 text-left hover:bg-teal-500/15"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-500 text-white">
                <Play size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-teal-700 dark:text-teal-300">Tiếp tục phiên đã lưu</span>
                <span className="block text-xs text-muted-foreground">
                  {savedSession.index}/{savedSession.total} chữ · {formatLastStudied(savedSession.savedAt)}
                </span>
              </span>
            </button>
          )}

          <div className="mb-6 grid grid-cols-3 gap-3">
            <StatCard value={formatLastStudied(stats?.lastStudiedAt)} label="Lần học cuối" icon={<Clock size={12} />} />
            <StatCard value={String(stats?.quizCount ?? 0)} label="Viết" icon={<PenLine size={12} />} />
            <StatCard value={stats ? `${stats.accuracy}%` : "—"} label="Độ chính xác" icon={<Target size={12} />} />
          </div>

          {/* type */}
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
            <PenLine size={18} className="text-rose-500" />
            <span className="font-medium text-foreground">
              Thông tin <span className="text-muted-foreground">›</span> Viết chữ
            </span>
          </div>

          {/* review scope (accuracy slider + favorites) */}
          <RowCard icon={<SlidersHorizontal size={18} />} text={scopeSummary(scoped.length, settings)} onClick={() => setDialog("scope")} />
          {/* content-display sheet opener */}
          <RowCard icon={<FileText size={18} />} text={contentSummary(settings)} onClick={() => setDialog("content")} className="mt-3" />
          {/* settings sheet opener */}
          <RowCard icon={<Settings2 size={18} />} text={settingsSummary(settings)} onClick={() => setDialog("settings")} className="mt-3" />

          <button
            onClick={start}
            disabled={scoped.length === 0}
            className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Bắt đầu"
          >
            <Play size={28} className="ml-1" />
          </button>
          {scoped.length === 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {subjects.length === 0 ? "Nhóm này chưa có Hán tự nào." : "Không có Hán tự nào khớp bộ lọc. Hãy chỉnh thanh trượt."}
            </p>
          )}
        </div>

        {dialog === "scope" && (
          <KanjiStudyScopeDialog
            subjects={subjects}
            accMap={accMap}
            favorites={favorites}
            value={{ accuracyMax: settings.accuracyMax, onlyFavorites: settings.onlyFavorites }}
            onApply={(v) => {
              update("accuracyMax", v.accuracyMax);
              update("onlyFavorites", v.onlyFavorites);
              setDialog(null);
            }}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog === "content" && (
          <WritingContentDialog settings={settings} toggle={toggle} onClose={() => setDialog(null)} />
        )}
        {dialog === "settings" && (
          <WritingSettingsDialog settings={settings} toggle={toggle} update={update} onClose={() => setDialog(null)} />
        )}
      </KanjiLayout>
    );
  }

  /* ── render: results ─────────────────────────────────────────────────── */

  if (phase === "results") {
    const distinct = new Map<number, { kanji: KanjiDetailDTO; correct: boolean }>();
    planRef.current.forEach((k, i) => {
      if (k.id != null && results[i] != null) distinct.set(k.id, { kanji: k, correct: results[i] === true });
    });
    const rows = [...distinct.values()];
    const correctCount = rows.filter((r) => r.correct).length;
    const pct = rows.length ? Math.round((correctCount / rows.length) * 100) : 0;

    return (
      <KanjiLayout pageScroll>
        <div className="mx-auto w-full max-w-2xl pb-28">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-500 to-rose-600 p-6 text-center text-white">
            <p className="text-sm font-semibold text-white/80">Kết quả luyện viết</p>
            <p className="mt-1 text-5xl font-extrabold">{pct}%</p>
            <p className="mt-1 text-white/90">
              Hoàn hảo {correctCount} / {rows.length} · {tally.correct} nét đúng
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/80">
              {saved ? (
                <>
                  <Check size={13} /> Đã lưu phiên học
                </>
              ) : (
                "Đang lưu..."
              )}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8">
            {rows.map(({ kanji, correct }) => (
              <button
                key={kanji.id}
                onClick={() => kanji.id != null && navigate(`/kanji-study/kanji/${kanji.id}?deck=${deckId}`)}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl border font-serif text-2xl transition",
                  correct
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                )}
                lang="ja"
              >
                {kanji.character}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-lg">
          <button
            onClick={() => setPhase("setup")}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-rose-400"
          >
            Quay lại
          </button>
          <button
            onClick={() => navigate(`/kanji-study/deck/${deckId}`)}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
          >
            Hoàn tất
          </button>
          <button
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-rose-400"
          >
            <RotateCcw size={15} /> Lặp lại
          </button>
        </div>
      </KanjiLayout>
    );
  }

  /* ── render: playing ─────────────────────────────────────────────────── */

  if (!cur) return null;
  const onTokens = readingTokens(cur.onyomi);
  const kunTokens = readingTokens(cur.kunyomi);

  return (
    <KanjiLayout pageScroll>
      <div className="mx-auto w-full max-w-2xl pb-10">
        {/* top bar */}
        <div className="mb-1 flex items-center gap-3">
          <button onClick={() => setPaused(true)} className="text-muted-foreground hover:text-foreground" title="Thoát">
            <ArrowLeft size={18} />
          </button>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <Check size={15} /> {tally.correct}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
            <X size={15} /> {tally.wrong}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400" title="Gợi ý / bỏ qua">
            ? {tally.hint}
          </span>
          <button onClick={() => setPaused(true)} className="ml-auto text-muted-foreground hover:text-foreground" title="Tạm dừng">
            <Pause size={18} />
          </button>
        </div>

        {/* progress + show-examples + strokes-remaining */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {Math.min(index + 1, plan.length)} <span className="font-normal text-muted-foreground">/ {plan.length}</span>
          </span>
          {!infoHidden && results[index] != null && (
            <button
              onClick={() => setShowExamples((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                showExamples ? "border-rose-400 text-rose-600 dark:text-rose-400" : "border-border text-muted-foreground hover:border-rose-400"
              )}
            >
              {showExamples ? "Ẩn ví dụ" : "Hiện ví dụ"}
            </button>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            {remaining != null ? `${remaining} nét` : `${cur.strokeCount ?? ""}`}
          </span>
        </div>

        {/* info area */}
        <div className="mb-5 flex min-h-[92px] flex-col items-center gap-2 text-center">
          {infoHidden ? (
            <span className="py-6 text-xs uppercase tracking-widest text-muted-foreground">Hypermode</span>
          ) : (
            <>
              {(settings.showOnyomi || settings.showKunyomi) && (onTokens.length > 0 || kunTokens.length > 0) && (
                <div className="flex flex-wrap justify-center gap-1.5" lang="ja">
                  {settings.showOnyomi &&
                    onTokens.map((t, i) => (
                      <span key={`on${i}`} className="rounded-md bg-sky-500/15 px-2 py-0.5 text-sm font-medium text-sky-700 dark:text-sky-300">
                        {t}
                      </span>
                    ))}
                  {settings.showKunyomi &&
                    kunTokens.map((t, i) => (
                      <span key={`kun${i}`} className="rounded-md bg-muted px-2 py-0.5 text-sm font-medium text-foreground">
                        {t}
                      </span>
                    ))}
                </div>
              )}
              {settings.showExtraReadings && hanViet && (
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{hanViet}</span>
              )}
              {settings.showMeaning && meaningOf(cur) && <span className="text-base text-foreground">{meaningOf(cur)}</span>}
              {settings.showNotes && (cur.formExplanation || cur.etymology) && (
                <span className="text-xs text-muted-foreground">{cur.formExplanation || cur.etymology}</span>
              )}
              {showExamples && cur.character && (
                <div className="mt-2 w-full max-w-md">
                  <KanjiReadingExamplesPanel
                    character={cur.character}
                    blank={results[index] == null}
                    onWordClick={results[index] != null ? openWordInfo : undefined}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* drawing surface + inline feedback panel (beside on wide screens, so
            the result no longer blocks the pad — "Tạm dừng sau khi trả lời") */}
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
          <KanjiWritingCanvas
            key={`${cur.id}-${attempt}`}
            character={cur.character ?? ""}
            strokeData={cur.strokeData}
            viewBox={cur.svgViewbox}
            leniency={settings.leniency}
            showHint={settings.showHint}
            showAnswer={settings.showAnswer}
            hypermode={settings.hypermode}
            starred={isFavorite(cur.id)}
            onStroke={onStroke}
            onProgress={onProgress}
            onComplete={onComplete}
            onInfo={cur.id != null ? () => openKanjiInfo(cur.id) : undefined}
            onToggleStar={cur.id != null ? () => toggleFavorite(cur.id!) : undefined}
          />

          {pauseInfo && (
            <div className="w-full max-w-[360px] rounded-2xl border border-border bg-card p-5 text-center lg:w-56 lg:self-center">
              <button
                type="button"
                onClick={() => openKanjiInfo(pauseInfo.kanji.id)}
                className={cn(
                  "mx-auto grid h-16 w-16 place-items-center rounded-full font-serif text-4xl underline decoration-dotted underline-offset-4",
                  pauseInfo.correct ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                )}
                lang="ja"
                title="Xem chi tiết Hán tự"
              >
                {pauseInfo.kanji.character}
              </button>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {pauseInfo.skipped ? "Đã bỏ qua" : pauseInfo.correct ? "Hoàn hảo!" : "Cần luyện thêm"}
              </p>
              {meaningOf(pauseInfo.kanji) && <p className="text-sm text-muted-foreground">{meaningOf(pauseInfo.kanji)}</p>}
              <button
                onClick={() => advanceTo(pauseInfo.next)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
              >
                <Play size={16} /> Tiếp tục
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Chạm vào chữ để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* stop / pause dialog — finish (partial results) · save & exit · resume */}
      {paused && (() => {
        const answeredCount = results.filter((r) => r != null).length;
        const correctK = results.filter((r) => r === true).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPaused(false)}>
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <p className="text-center text-lg font-semibold text-foreground">Tạm ngưng</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Đã viết</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{answeredCount} / {plan.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Hoàn hảo</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{correctK}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Nét đúng</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{tally.correct}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setPaused(false);
                    // Nothing written yet → quit straight to the study settings;
                    // otherwise finish as before (the results screen submits).
                    if (answeredCount === 0) {
                      clearSession("WRITING", Number(deckId), groupIndex);
                      setPhase("setup");
                    } else {
                      setPhase("results");
                    }
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-rose-400"
                >
                  Kết thúc
                </button>
                <button
                  onClick={saveAndExit}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-rose-400"
                >
                  Lưu &amp; thoát
                </button>
                <button
                  onClick={() => setPaused(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                >
                  <Play size={15} /> Tiếp tục
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </KanjiLayout>
  );
}

/* ── small presentational helpers ───────────────────────────────────────── */

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </p>
    </div>
  );
}

function RowCard({
  icon,
  text,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left hover:border-rose-400", className)}
    >
      <span className="shrink-0 text-rose-500">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{text}</span>
    </button>
  );
}
