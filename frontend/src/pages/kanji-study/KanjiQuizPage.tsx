import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, CheckSquare, Clock, FileText, LayoutGrid, List, Pause, Play,
  RotateCcw, Settings2, SlidersHorizontal, Square, Star, Target, Volume2, X,
} from "lucide-react";
import {
  kanjiDeckApi, kanjiProgressApi, kanjiReadingApi, kanjiStudyApi, kanjiVocabularyApi,
} from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiProgressDTO, KanjiReadingDTO } from "@/types";
import type { KanjiVocabWord } from "@/types/features/kanji_study";
import { getCurrentUserId } from "@/utils/auth.utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { KanjiLayout } from "./components/KanjiLayout";
import { useAllKanjiDetails, useDeckKanji } from "./hooks/useDeckKanji";
import { useQuizSettings, type QuizOrder, type QuizSettings } from "./hooks/useQuizSettings";
import {
  QUIZ_CONTENT_KEYS, QuizContentDialog, QuizSettingsDialog,
  type QuizContentKey, type QuizType,
} from "./components/KanjiQuizSettingsDialogs";
import { KanjiStudyScopeDialog, applyScope } from "./components/KanjiStudyScopeDialog";
import { KanjiReadingExamplesPanel } from "./components/KanjiReadingExamplesPanel";
import { useKanjiFavorites } from "./lib/kanjiFavorites";
import {
  clearSession, loadSession, saveSession, useSavedSession,
  type SavedQuizQuestion, type SavedQuizSession,
} from "./lib/kanjiSession";

/**
 * Trắc nghiệm (quiz) runner — the four question directions from the mobile app:
 *
 * - **info-kanji**     (Thông tin → Kanji): meaning + readings → pick the kanji
 * - **kanji-meaning**  (Kanji → Nghĩa):     kanji → pick the meaning
 * - **kanji-reading**  (Kanji → Cách đọc):  kanji → pick *all* valid on/kun readings (multi-select)
 * - **example-kanji**  (Ví dụ → Kanji):     an example word/sentence with the kanji blanked → pick the kanji
 *
 * Sessions autosave while playing, so a refresh (or a trip to a kanji's detail)
 * resumes on the exact question rather than the setup screen.
 */

const TYPES: { key: QuizType; label: string; example: string }[] = [
  { key: "info-kanji", label: "Thông tin → Kanji", example: "hoa → 花" },
  { key: "kanji-meaning", label: "Kanji → Nghĩa", example: "花 → hoa" },
  { key: "kanji-reading", label: "Kanji → Cách đọc", example: "花 → カ、はな" },
  { key: "example-kanji", label: "Ví dụ → Kanji", example: "◯見【はなみ】→ 花" },
];

interface QOption {
  id: string;
  label: string;
  correct: boolean;
  glyph?: boolean;
}

interface Question {
  kanji: KanjiDetailDTO;
  type: QuizType;
  options: QOption[];
  onyomiCount?: number; // kanji-reading: how many on-yomi to find
  kunyomiCount?: number; // kanji-reading: how many kun-yomi to find
  exampleWord?: string;
  exampleReading?: string; // furigana for the example
  exampleMeaning?: string;
  exampleType?: string; // word class ("Noun"…) when available
  exampleIsSentence?: boolean;
}

const RESOLVED = "__resolved__"; // `answered` sentinel for the multi-select reading quiz

const ORDER_SUMMARY: Record<QuizOrder, string> = {
  ACCURACY: "Theo độ chính xác",
  RANDOM: "Ngẫu nhiên",
  SEQUENTIAL: "Theo thứ tự",
};

/* ── helpers ──────────────────────────────────────────────────────────── */

const meaningOf = (k: KanjiDetailDTO) => (k.meaningVi || k.meaning || "").trim();

function formatLastStudied(iso?: string | null): string {
  if (!iso) return "Chưa học";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text?: string) {
  try {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* TTS unavailable — silently skip */
  }
}

const speakReadings = (k?: KanjiDetailDTO) => speak([k?.onyomi, k?.kunyomi].filter(Boolean).join("、"));

/** Reading tokens of one field (okurigana / inflection markers stripped). */
function splitReadings(raw?: string): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const tok of raw.split(/[、,，/・\s]+/)) {
    const t = tok.trim();
    if (!t) continue;
    const stem = t.split(/[.\-（(~～]/)[0].trim();
    if (stem) out.push(stem);
  }
  return [...new Set(out)];
}

/** The "N5".."N1" digit of a JLPT label, for matching a word's level loosely. */
const jlptDigit = (s?: string | null): string | null => {
  const m = /([1-5])/.exec(s ?? "");
  return m ? m[1] : null;
};

/** Multiple-choice options of kanji glyphs — the correct char plus distractors. */
function glyphOptions(correct: string, pool: KanjiDetailDTO[]): QOption[] {
  const distractors = [...new Set(pool.map((p) => p.character ?? "").filter((c) => c && c !== correct))];
  const labels = shuffle([correct, ...shuffle(distractors).slice(0, 7)]);
  return labels.map((label, i) => ({ id: String(i), label, correct: label === correct, glyph: true }));
}

function buildSyncQuestion(
  kanji: KanjiDetailDTO,
  type: Exclude<QuizType, "example-kanji">,
  pool: KanjiDetailDTO[]
): Question {
  if (type === "kanji-meaning") {
    const correct = meaningOf(kanji);
    const distractors = [...new Set(pool.map(meaningOf).filter((m) => m && m !== correct))];
    const labels = shuffle([correct, ...shuffle(distractors).slice(0, 5)]);
    return { kanji, type, options: labels.map((label, i) => ({ id: String(i), label, correct: label === correct })) };
  }

  if (type === "info-kanji") {
    return { kanji, type, options: glyphOptions(kanji.character ?? "", pool) };
  }

  // kanji-reading — pick ALL valid on-yomi + kun-yomi (multi-select).
  const on = splitReadings(kanji.onyomi);
  const kun = splitReadings(kanji.kunyomi);
  const valid = new Set([...on, ...kun]);
  const onDist = shuffle([...new Set(pool.flatMap((p) => splitReadings(p.onyomi)))].filter((r) => !valid.has(r)))
    .slice(0, Math.max(2, 5 - on.length));
  const kunDist = shuffle([...new Set(pool.flatMap((p) => splitReadings(p.kunyomi)))].filter((r) => !valid.has(r)))
    .slice(0, Math.max(3, 7 - kun.length));
  const labels = shuffle([...on, ...kun, ...onDist, ...kunDist]);
  return {
    kanji,
    type: "kanji-reading",
    onyomiCount: on.length,
    kunyomiCount: kun.length,
    options: labels.map((label, i) => ({ id: String(i), label, correct: valid.has(label) })),
  };
}

/**
 * "Ví dụ → Kanji": up to `n` example questions for one kanji — each an example
 * word (or sentence) with the kanji blanked out, carrying furigana + meaning as
 * optional hints. Honours the example picker; returns `[]` so the caller can
 * fall back to info-kanji.
 */
async function buildExampleQuestions(
  k: KanjiDetailDTO,
  pool: KanjiDetailDTO[],
  s: QuizSettings,
  n: number
): Promise<Question[]> {
  const char = k.character;
  if (!char) return [];

  if (s.exampleSource === "SENTENCE") {
    const res = await kanjiVocabularyApi.sentences(char, 0, Math.max(10, n * 3));
    const sents = (res.items ?? []).filter((it) => it.japanese?.includes(char)).slice(0, n);
    return sents.map((sent) => ({
      kanji: k,
      type: "example-kanji" as const,
      exampleWord: sent.japanese.split(char).join("◯"),
      exampleMeaning: sent.translationVi || sent.translationEn || undefined,
      exampleIsSentence: true,
      options: glyphOptions(char, pool),
    }));
  }

  const res = await kanjiVocabularyApi.words(char, 0, Math.max(30, n * 5));
  let items = res.items ?? [];
  if (s.exampleJlpt !== "ALL") {
    const want = jlptDigit(s.exampleJlpt);
    const filtered = items.filter((w) => jlptDigit(w.levelCode ?? w.levelName) === want);
    if (filtered.length) items = filtered;
  }
  if (s.exampleCommonOnly) {
    const filtered = items.filter((w) => w.frequency != null);
    if (filtered.length) items = filtered;
  }
  return items
    .filter((w) => w.word)
    .slice(0, n)
    .map((w) => ({
      kanji: k,
      type: "example-kanji" as const,
      exampleWord: w.word.split(char).join("◯"),
      exampleReading: w.reading,
      exampleMeaning: w.meaningText,
      exampleType: w.wordType,
      options: glyphOptions(char, pool),
    }));
}

function contentSummary(type: QuizType, s: QuizSettings): string {
  if (type === "example-kanji") {
    const parts = [s.exampleSource === "SENTENCE" ? "Câu ngẫu nhiên" : "Từ vựng ngẫu nhiên"];
    if (s.exampleJlpt !== "ALL") parts.push(`JLPT ${s.exampleJlpt}`);
    if (s.exampleCommonOnly) parts.push("Phổ biến");
    return parts.join(" · ");
  }
  const keys = QUIZ_CONTENT_KEYS[type];
  const labels: string[] = [];
  if (keys.includes("showOnyomi") && s.showOnyomi) labels.push("Âm On");
  if (keys.includes("showKunyomi") && s.showKunyomi) labels.push("Âm Kun");
  if (keys.includes("showExtraReadings") && s.showExtraReadings) labels.push("Phát âm bổ sung");
  if (keys.includes("showMeaning") && s.showMeaning) labels.push("Ý nghĩa");
  if (keys.includes("showNotes") && s.showNotes) labels.push("Ghi chú");
  return labels.length ? labels.join(", ") : "Không hiển thị gợi ý";
}

function generalSummary(s: QuizSettings): string {
  const parts = [ORDER_SUMMARY[s.order]];
  if (s.pauseAfterAnswer) parts.push("Tạm dừng sau khi trả lời");
  if (s.repeatOnWrong) parts.push("Lặp lại khi sai");
  if (s.playReadingAudio) parts.push("Phát âm đọc");
  return parts.join(", ");
}

function scopeSummary(count: number, s: QuizSettings, type: QuizType): string {
  const parts = [type === "example-kanji" ? `${count} kanji × ${s.examplesPerKanji}` : `${count} kanji`];
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

/* ── page ─────────────────────────────────────────────────────────────── */

export default function KanjiQuizPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [params] = useSearchParams();
  const groupParam = params.get("group");
  const groupIndex = groupParam != null && groupParam !== "" ? Number(groupParam) : null;
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { settings, update, toggle } = useQuizSettings();
  const { favorites, isFavorite, toggle: toggleFavorite } = useKanjiFavorites();
  const savedSession = useSavedSession("QUIZ", deckId, groupIndex);

  const { data: deck } = useQuery({
    queryKey: ["kanji-deck", deckId],
    enabled: !!deckId,
    queryFn: () => kanjiDeckApi.getById(deckId!),
  });
  const { data: stats } = useQuery({
    queryKey: ["kanji-quiz-stats", deckId, groupIndex],
    enabled: !!deckId,
    queryFn: () => kanjiStudyApi.stats(Number(deckId), groupIndex),
  });
  const { kanji: deckKanji, isLoading } = useDeckKanji(deckId);
  const allKanji = useAllKanjiDetails();

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
    () => (groupIndex == null ? deckKanji : deckKanji.filter((k) => k.groupIndex === groupIndex)).map((k) => k.kanji),
    [deckKanji, groupIndex]
  );
  const pool = useMemo(() => {
    const fromDeck = deckKanji.map((k) => k.kanji);
    if (fromDeck.length >= 12) return fromDeck;
    const extra = allKanji.data ? [...allKanji.data.values()] : [];
    return [...fromDeck, ...extra];
  }, [deckKanji, allKanji.data]);
  const charToId = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of pool) if (k.character && k.id != null && !m.has(k.character)) m.set(k.character, k.id);
    return m;
  }, [pool]);

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

  const orderSubjects = useCallback(
    (subs: KanjiDetailDTO[]): KanjiDetailDTO[] => {
      if (settings.order === "RANDOM") return shuffle(subs);
      if (settings.order === "SEQUENTIAL") return subs;
      const accOf = (k: KanjiDetailDTO) => (k.id != null && accMap?.has(k.id) ? accMap.get(k.id)! : -1);
      return [...subs].sort((a, b) => accOf(a) - accOf(b));
    },
    [settings.order, accMap]
  );

  const [phase, setPhase] = useState<"setup" | "preparing" | "playing" | "results">("setup");
  const [type, setType] = useState<QuizType>("kanji-meaning");
  const [dialog, setDialog] = useState<"content" | "settings" | "scope" | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const questionsRef = useRef<Question[]>([]); // mirrors `questions` for fresh length in advance()
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [picks, setPicks] = useState<Set<string>>(new Set()); // multi-select reading
  const [showExamples, setShowExamples] = useState(false); // "Hiện ví dụ" (after answering)
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0); // whole-session seconds
  const elapsedRef = useRef(0);
  const [saved, setSaved] = useState(false);
  const [resultView, setResultView] = useState<"list" | "grid">("list");
  const [resultSort, setResultSort] = useState<"order" | "wrong" | "correct">("order");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const submittedRef = useRef(false);
  const autoResumedRef = useRef(false);

  // Session timer.
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const t = setInterval(() => setElapsed((e) => { elapsedRef.current = e + 1; return e + 1; }), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  // Collapse the "Hiện ví dụ" panel when the question changes. (The reading
  // multi-select `picks` are reset explicitly in advance/start so a resume can
  // restore them instead of having this effect wipe them.)
  useEffect(() => { setShowExamples(false); }, [index]);

  const buildSnapshot = useCallback((): SavedQuizSession => {
    const qs = questionsRef.current;
    return {
      v: 1,
      mode: "QUIZ",
      deckId: Number(deckId),
      groupIndex,
      deckTitle: deck?.title,
      groupLabel,
      type,
      questions: qs as SavedQuizQuestion[],
      results: qs.map((_, i) => (results[i] == null ? null : results[i])),
      index,
      elapsed: elapsedRef.current,
      total: qs.length,
      startedAt: startedAtRef.current,
      savedAt: new Date().toISOString(),
      answered,
      picks: [...picks],
    };
  }, [deckId, groupIndex, deck?.title, groupLabel, type, results, index, answered, picks]);

  // Autosave the live session so a refresh / kanji-detail trip resumes here.
  useEffect(() => {
    if (phase !== "playing" || questionsRef.current.length === 0) return;
    saveSession(buildSnapshot());
  }, [phase, index, results, buildSnapshot]);

  const start = async (override?: KanjiDetailDTO[]) => {
    const picked = override ?? orderSubjects(scoped);
    if (picked.length === 0) return;

    let qs: Question[];
    if (type === "example-kanji") {
      setPhase("preparing");
      qs = [];
      for (const k of picked) {
        let made: Question[] = [];
        if (k.character) {
          try {
            made = await buildExampleQuestions(k, pool, settings, settings.examplesPerKanji);
          } catch {
            /* fall through to info-kanji */
          }
        }
        qs.push(...(made.length ? made : [buildSyncQuestion(k, "info-kanji", pool)]));
      }
      // With 2+ examples per kanji the questions are otherwise grouped (a
      // kanji's examples back-to-back); shuffle so they're interleaved.
      if (settings.examplesPerKanji > 1) qs = shuffle(qs);
    } else {
      qs = picked.map((k) => buildSyncQuestion(k, type, pool));
    }

    clearSession("QUIZ", Number(deckId), groupIndex); // a fresh run supersedes any saved one
    questionsRef.current = qs;
    setQuestions(qs);
    setResults([]);
    setIndex(0);
    setAnswered(null);
    setPicks(new Set());
    setShowExamples(false);
    setElapsed(0);
    elapsedRef.current = 0;
    setPaused(false);
    setSaved(false);
    setSelectMode(false);
    setSelected(new Set());
    submittedRef.current = false;
    startedAtRef.current = new Date().toISOString();
    setPhase("playing");
  };

  const resume = useCallback((s: SavedQuizSession) => {
    setType(s.type);
    questionsRef.current = s.questions as Question[];
    setQuestions(s.questions as Question[]);
    setResults(s.results);
    // Land on the EXACT saved question (no auto-skip): a return from a
    // kanji-detail trip resumes the same — possibly answered — question and the
    // learner advances themselves.
    const i = Math.min(Math.max(s.index, 0), s.questions.length - 1);
    setIndex(i);
    setElapsed(s.elapsed);
    elapsedRef.current = s.elapsed;
    // Restore the revealed state only in "Tạm dừng sau khi trả lời" mode, where
    // a manual "Tiếp tục" exists; otherwise the question resumes fresh.
    const reveal = s.results[i] != null && settings.pauseAfterAnswer ? s.answered ?? null : null;
    setAnswered(reveal);
    setPicks(new Set(reveal != null ? s.picks ?? [] : []));
    setShowExamples(false);
    setPaused(false);
    setSaved(false);
    setSelectMode(false);
    setSelected(new Set());
    submittedRef.current = false;
    startedAtRef.current = s.startedAt;
    setPhase("playing");
  }, [settings.pauseAfterAnswer]);

  // Auto-resume on a browser refresh or a return from a kanji-detail trip.
  useEffect(() => {
    if (autoResumedRef.current || phase !== "setup") return;
    const wantResume = params.get("resume") === "1" || wasReloaded();
    if (!wantResume) return;
    const s = loadSession("QUIZ", Number(deckId), groupIndex);
    if (s && s.mode === "QUIZ" && s.questions.length > 0) {
      autoResumedRef.current = true;
      resume(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deckId, groupIndex]);

  const saveAndExit = () => {
    if (questionsRef.current.length > 0) saveSession(buildSnapshot());
    navigate(`/kanji-study/deck/${deckId}`);
  };

  const openKanjiInfo = (kid?: number | null) => {
    if (kid == null) return;
    if (questionsRef.current.length > 0) saveSession(buildSnapshot());
    const g = groupIndex != null ? `&group=${groupIndex}` : "";
    navigate(`/kanji-study/kanji/${kid}?deck=${deckId}&focus=1&from=quiz${g}`);
  };

  // Open a vocabulary word from the "Hiện ví dụ" panel (saves the session so the
  // back button resumes this exact question).
  const openWordInfo = (word: KanjiVocabWord) => {
    if (questionsRef.current.length > 0) saveSession(buildSnapshot());
    const g = groupIndex != null ? `&group=${groupIndex}` : "";
    navigate(`/kanji-study/word/${word.id}?focus=1&from=quiz&deck=${deckId}${g}`);
  };

  // Save the finished session once (also drives the stats header next time).
  useEffect(() => {
    if (phase !== "results" || submittedRef.current) return;
    submittedRef.current = true;
    clearSession("QUIZ", Number(deckId), groupIndex); // session is done
    const seen = new Map<number, boolean>();
    questions.forEach((q, i) => {
      if (q.kanji.id != null && results[i] != null) seen.set(q.kanji.id, results[i] === true);
    });
    const items = [...seen].map(([kanjiId, correct]) => ({ kanjiId, correct }));
    if (items.length === 0) return;
    kanjiStudyApi
      .submit({ deckId: Number(deckId), groupIndex, mode: "QUIZ", startedAt: startedAtRef.current, items })
      .then(() => {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: ["kanji-quiz-stats", deckId, groupIndex] });
        queryClient.invalidateQueries({ queryKey: ["kanji-recent-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["kanji-accuracy", userId] });
      })
      .catch((e) => logger.error("quiz submit failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const current = questions[index];

  const extraForType = current ? QUIZ_CONTENT_KEYS[current.type].includes("showExtraReadings") : false;
  const { data: hanViet } = useQuery({
    queryKey: ["kanji-readings", current?.kanji.id],
    enabled: phase === "playing" && current?.kanji.id != null && settings.showExtraReadings && extraForType,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await kanjiReadingApi.getPage({ page: 0, size: 50 }, undefined, { kanjiId: current!.kanji.id } as never);
      const list = (res.content ?? (res as any).items ?? []) as KanjiReadingDTO[];
      return list.filter((r) => r.readingType === "HAN_VIET").map((r) => r.value).filter(Boolean).join("、");
    },
  });

  // Reading audio (skip the reading quiz so we don't speak the answer).
  useEffect(() => {
    if (phase !== "playing" || !settings.playReadingAudio) return;
    const q = questionsRef.current[index];
    if (!q || q.type === "kanji-reading" || q.type === "example-kanji") return;
    speakReadings(q.kanji);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, settings.playReadingAudio]);

  const advance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setAnswered(null);
    setPicks(new Set());
    setShowExamples(false);
    if (index >= questionsRef.current.length - 1) setPhase("results");
    else setIndex(index + 1);
  };

  const commitResult = (correct: boolean) => {
    setResults((r) => {
      const next = [...r];
      next[index] = correct;
      return next;
    });
    if (!correct && settings.repeatOnWrong) {
      questionsRef.current = [...questionsRef.current, questionsRef.current[index]];
      setQuestions(questionsRef.current);
    }
    if (!settings.pauseAfterAnswer) advanceTimer.current = setTimeout(advance, 1100);
  };

  const answer = (optId: string, correct: boolean) => {
    if (answered != null) return;
    setAnswered(optId);
    commitResult(correct);
  };

  // kanji-reading: freely toggle every reading you think is valid (selecting a
  // wrong one no longer fails instantly), then submit with "Kiểm tra".
  const toggleReading = (o: QOption) => {
    if (answered != null) return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(o.id)) next.delete(o.id);
      else next.add(o.id);
      return next;
    });
  };

  // "Kiểm tra": correct iff the chosen set is exactly the valid set (every
  // valid reading picked, no invalid one picked).
  const checkReading = () => {
    if (answered == null && current) {
      const correct = current.options.every((o) => o.correct === picks.has(o.id));
      setAnswered(RESOLVED);
      commitResult(correct);
    }
  };

  const correctCount = results.filter(Boolean).length;
  const wrongCount = results.filter((r) => r === false).length;
  const answeredCount = results.filter((r) => r != null).length;

  // Whether tapping a revealed answer should open that kanji's detail.
  const inspectOnTap = answered != null && settings.pauseAfterAnswer;

  /* ── render ─────────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <KanjiLayout pageScroll>
        <p className="text-muted-foreground max-w-2xl mx-auto">Đang tải...</p>
      </KanjiLayout>
    );
  }

  if (phase === "setup" || phase === "preparing") {
    return (
      <KanjiLayout pageScroll>
        <div className="max-w-2xl mx-auto w-full pb-10">
          <button
            onClick={() => navigate(`/kanji-study/deck/${deckId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft size={16} /> {deck?.title ?? "Deck"}
            {groupLabel ? ` · ${groupLabel}` : ""}
          </button>

          <h1 className="text-2xl font-bold text-foreground mb-1">Trắc nghiệm</h1>
          <p className="text-muted-foreground mb-5">
            {subjects.length} Hán tự{groupLabel ? ` · ${groupLabel}` : ""}
          </p>

          {savedSession && savedSession.mode === "QUIZ" && (
            <button
              onClick={() => resume(savedSession)}
              className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-teal-400/60 bg-teal-500/10 px-4 py-3.5 text-left hover:bg-teal-500/15"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-500 text-white">
                <Play size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-teal-700 dark:text-teal-300">Tiếp tục phiên đã lưu</span>
                <span className="block text-xs text-muted-foreground">
                  {savedSession.index}/{savedSession.total} câu · {formatLastStudied(savedSession.savedAt)}
                </span>
              </span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-base font-bold text-foreground">{formatLastStudied(stats?.lastStudiedAt)}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} /> Lần học cuối
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-base font-bold text-foreground">{stats?.quizCount ?? 0}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Trắc nghiệm</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-base font-bold text-foreground">{stats ? `${stats.accuracy}%` : "—"}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Target size={12} /> Độ chính xác
              </p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-foreground mb-2">Chọn kiểu bài kiểm tra</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border/60 overflow-hidden mb-5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{t.label}</span>
                  <span className="block text-xs text-muted-foreground" lang="ja">例）{t.example}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 h-5 w-5 rounded-full border-2 grid place-items-center",
                    type === t.key ? "border-rose-500" : "border-muted-foreground/40"
                  )}
                >
                  {type === t.key && <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />}
                </span>
              </button>
            ))}
          </div>

          <RowCard icon={<SlidersHorizontal size={18} />} text={scopeSummary(scoped.length, settings, type)} onClick={() => setDialog("scope")} />
          <RowCard icon={<FileText size={18} />} text={contentSummary(type, settings)} onClick={() => setDialog("content")} className="mt-3" />
          <RowCard icon={<Settings2 size={18} />} text={generalSummary(settings)} onClick={() => setDialog("settings")} className="mt-3" />

          <button
            onClick={() => start()}
            disabled={phase === "preparing" || scoped.length === 0}
            className="mx-auto mt-8 flex items-center justify-center h-16 w-16 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Bắt đầu"
          >
            {phase === "preparing" ? (
              <span className="h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
            ) : (
              <Play size={28} className="ml-1" />
            )}
          </button>
          {phase === "preparing" ? (
            <p className="text-center text-xs text-muted-foreground mt-3">Đang chuẩn bị câu hỏi...</p>
          ) : scoped.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground mt-3">Không có Hán tự nào khớp bộ lọc. Hãy chỉnh thanh trượt.</p>
          ) : null}
        </div>

        {dialog === "scope" && (
          <KanjiStudyScopeDialog
            subjects={subjects}
            accMap={accMap}
            favorites={favorites}
            value={{
              accuracyMax: settings.accuracyMax,
              onlyFavorites: settings.onlyFavorites,
              examplesPerKanji: type === "example-kanji" ? settings.examplesPerKanji : undefined,
            }}
            onApply={(v) => {
              update("accuracyMax", v.accuracyMax);
              update("onlyFavorites", v.onlyFavorites);
              if (v.examplesPerKanji != null) update("examplesPerKanji", v.examplesPerKanji);
              setDialog(null);
            }}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog === "content" && (
          <QuizContentDialog type={type} settings={settings} toggle={toggle} update={update} onClose={() => setDialog(null)} />
        )}
        {dialog === "settings" && (
          <QuizSettingsDialog settings={settings} toggle={toggle} update={update} onClose={() => setDialog(null)} />
        )}
      </KanjiLayout>
    );
  }

  if (phase === "results") {
    const lastIdx = new Map<number, number>();
    questions.forEach((q, i) => {
      if (q.kanji.id != null && results[i] != null) lastIdx.set(q.kanji.id, i);
    });
    const answeredIdx = [...lastIdx.values()];
    const correctTotal = answeredIdx.filter((i) => results[i]).length;
    const wrongTotal = answeredIdx.length - correctTotal;
    const total = answeredIdx.length;
    const pct = total > 0 ? Math.round((correctTotal / total) * 100) : 0;
    const sortedResultIdx = (() => {
      if (resultSort === "wrong") return [...answeredIdx].sort((a, b) => Number(!!results[a]) - Number(!!results[b]));
      if (resultSort === "correct") return [...answeredIdx].sort((a, b) => Number(!!results[b]) - Number(!!results[a]));
      return answeredIdx;
    })();
    const toggleSelect = (i: number) =>
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(i)) n.delete(i);
        else n.add(i);
        return n;
      });
    return (
      <KanjiLayout pageScroll>
        <div className="max-w-2xl mx-auto w-full pb-28">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 text-center">
            <p className="text-sm font-semibold text-white/80">Kết quả</p>
            <p className="mt-1 text-5xl font-extrabold">{pct}%</p>
            <p className="mt-1 text-white/90">
              Đúng {correctTotal} · Sai {wrongTotal} / {total}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/80">
              {saved ? <><Check size={13} /> Đã lưu phiên học</> : "Đang lưu..."}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground mr-auto">Chi tiết</span>
            <select
              value={resultSort}
              onChange={(e) => setResultSort(e.target.value as typeof resultSort)}
              className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-rose-400"
              aria-label="Sắp xếp kết quả"
            >
              <option value="order">Thứ tự</option>
              <option value="wrong">Sai trước</option>
              <option value="correct">Đúng trước</option>
            </select>
            <button
              onClick={() => setResultView((v) => (v === "list" ? "grid" : "list"))}
              title="Đổi cách xem"
              className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-rose-400"
            >
              {resultView === "list" ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
            <button
              onClick={() => { setSelectMode((m) => !m); setSelected(new Set()); }}
              title="Chọn kết quả"
              className={cn(
                "h-8 w-8 grid place-items-center rounded-lg border",
                selectMode
                  ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-rose-400"
              )}
            >
              <CheckSquare size={16} />
            </button>
          </div>

          {resultView === "list" ? (
            <div className="mt-3 flex flex-col divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden">
              {sortedResultIdx.map((i) => {
                const q = questions[i];
                const ok = results[i];
                const sel = selected.has(i);
                return (
                  <button
                    key={i}
                    onClick={() =>
                      selectMode
                        ? toggleSelect(i)
                        : q.kanji.id != null && navigate(`/kanji-study/kanji/${q.kanji.id}?deck=${deckId}`)
                    }
                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {selectMode &&
                      (sel ? (
                        <CheckSquare size={18} className="text-rose-500 shrink-0" />
                      ) : (
                        <Square size={18} className="text-muted-foreground shrink-0" />
                      ))}
                    <span
                      className={cn(
                        "grid place-items-center h-11 w-11 rounded-full font-serif text-2xl shrink-0",
                        ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      )}
                      lang="ja"
                    >
                      {q.kanji.character}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-foreground truncate">{meaningOf(q.kanji) || "—"}</span>
                      {q.exampleReading && (
                        <span className="block text-xs text-muted-foreground" lang="ja">【{q.exampleReading}】</span>
                      )}
                    </span>
                    {!selectMode &&
                      (ok ? (
                        <Check size={20} className="text-emerald-500 shrink-0" />
                      ) : (
                        <X size={20} className="text-rose-500 shrink-0" />
                      ))}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-5 sm:grid-cols-8 gap-2">
              {sortedResultIdx.map((i) => {
                const q = questions[i];
                const ok = results[i];
                const sel = selected.has(i);
                return (
                  <button
                    key={i}
                    onClick={() =>
                      selectMode
                        ? toggleSelect(i)
                        : q.kanji.id != null && navigate(`/kanji-study/kanji/${q.kanji.id}?deck=${deckId}`)
                    }
                    className={cn(
                      "aspect-square rounded-xl border grid place-items-center font-serif text-2xl transition",
                      ok
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                      sel && "ring-2 ring-rose-500"
                    )}
                    lang="ja"
                  >
                    {q.kanji.character}
                  </button>
                );
              })}
            </div>
          )}

          {selectMode && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-auto">{selected.size} đã chọn</span>
              <button
                onClick={() => setSelected(new Set(answeredIdx))}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:border-rose-400"
              >
                Chọn tất cả
              </button>
              <button
                disabled={selected.size === 0}
                onClick={() => start([...selected].sort((a, b) => a - b).map((i) => questions[i].kanji))}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-40"
              >
                <RotateCcw size={14} /> Học lại đã chọn ({selected.size})
              </button>
            </div>
          )}
        </div>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl border border-border bg-card shadow-lg px-3 py-2.5">
          <button
            onClick={() => setPhase("setup")}
            className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:border-rose-400"
          >
            Quay lại
          </button>
          <button
            onClick={() => navigate(`/kanji-study/deck/${deckId}`)}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"
          >
            Hoàn tất
          </button>
          <button
            onClick={() => start()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:border-rose-400"
          >
            <RotateCcw size={15} /> Lặp lại
          </button>
        </div>
      </KanjiLayout>
    );
  }

  // phase === "playing"
  if (!current) return null;
  const total = questions.length;
  const isReading = current.type === "kanji-reading";

  const keys = QUIZ_CONTENT_KEYS[current.type];
  const can = (k: QuizContentKey) => keys.includes(k);
  const isInfo = current.type === "info-kanji";
  const onKunLine = [
    settings.showOnyomi && can("showOnyomi") ? current.kanji.onyomi : "",
    settings.showKunyomi && can("showKunyomi") ? current.kanji.kunyomi : "",
  ].filter(Boolean).join("　");
  const showExtra = settings.showExtraReadings && can("showExtraReadings") && !!hanViet;
  const meaning = meaningOf(current.kanji);
  const showMeaningClue = settings.showMeaning && can("showMeaning") && !!meaning;
  const notes = current.kanji.formExplanation || current.kanji.etymology || "";
  const showNotes = settings.showNotes && can("showNotes") && !!notes;
  const infoFallbackMeaning = isInfo && !showMeaningClue && !onKunLine && !showExtra && !!meaning;

  return (
    <KanjiLayout pageScroll>
      <div className="max-w-2xl mx-auto w-full pb-10">
        {/* top bar */}
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setPaused(true)} className="text-muted-foreground hover:text-foreground" title="Thoát">
            <ArrowLeft size={18} />
          </button>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <Check size={15} /> {correctCount}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
            <X size={15} /> {wrongCount}
          </span>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {String(Math.floor(elapsed / 60)).padStart(1, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <button
            onClick={() => current.kanji.id != null && toggleFavorite(current.kanji.id)}
            className="text-muted-foreground hover:text-amber-400"
            title="Yêu thích"
          >
            <Star size={18} className={cn(isFavorite(current.kanji.id) && "fill-amber-400 text-amber-400")} />
          </button>
          <button onClick={() => setPaused(true)} className="text-muted-foreground hover:text-foreground" title="Tạm dừng">
            <Pause size={18} />
          </button>
        </div>

        {/* progress */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums mb-6">
          {index + 1} <span className="text-muted-foreground font-normal">/ {total}</span>
        </p>

        {/* prompt */}
        <div className="min-h-[160px] flex flex-col items-center justify-center text-center gap-3 mb-8">
          {(current.type === "kanji-meaning" || isReading) && (
            <button
              type="button"
              onClick={() => inspectOnTap && openKanjiInfo(current.kanji.id)}
              className={cn("font-serif text-7xl leading-none text-foreground", inspectOnTap && "underline decoration-dotted underline-offset-8")}
              lang="ja"
            >
              {current.kanji.character}
            </button>
          )}
          {current.exampleWord && (() => {
            // After answering, fill the ◯ back in with the (highlighted) kanji
            // — even on a wrong answer — and always reveal furigana + meaning.
            const revealEx = answered != null;
            const ch = current.kanji.character ?? "";
            const segments = current.exampleWord.split("◯");
            const showFuri = (settings.exampleShowFurigana || revealEx) && !!current.exampleReading;
            const showMean = (settings.exampleShowMeaning || revealEx) && !!current.exampleMeaning;
            return (
              <span className="flex flex-col items-center gap-1.5">
                {showFuri && (
                  <span className="text-sm text-muted-foreground" lang="ja">{current.exampleReading}</span>
                )}
                <span className="inline-flex items-center gap-2">
                  <span className={cn("font-serif leading-snug text-foreground", current.exampleIsSentence ? "text-2xl" : "text-5xl")} lang="ja">
                    {revealEx && ch
                      ? segments.map((seg, i) => (
                          <span key={i}>
                            {seg}
                            {i < segments.length - 1 && (
                              <span className="text-emerald-600 dark:text-emerald-400">{ch}</span>
                            )}
                          </span>
                        ))
                      : current.exampleWord}
                  </span>
                  <button
                    onClick={() => speak(current.exampleReading || (revealEx ? segments.join(ch) : current.exampleWord))}
                    className="text-muted-foreground hover:text-foreground"
                    title="Phát âm"
                  >
                    <Volume2 size={20} />
                  </button>
                </span>
                {showMean && (
                  <span className="flex flex-col items-center">
                    {current.exampleType && <span className="text-xs font-medium text-sky-600 dark:text-sky-400">{current.exampleType}</span>}
                    <span className="text-base text-foreground">{current.exampleMeaning}</span>
                  </span>
                )}
              </span>
            );
          })()}
          {/* reading quiz: meaning + how many readings to find */}
          {isReading && (
            <>
              {meaning && <span className="text-base text-muted-foreground">{meaning}</span>}
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-600/80 px-2.5 py-1 text-sm font-medium text-white">音読み：{current.onyomiCount ?? 0}</span>
                <span className="rounded-md bg-sky-700/80 px-2.5 py-1 text-sm font-medium text-white">訓読み：{current.kunyomiCount ?? 0}</span>
              </span>
            </>
          )}
          {(isInfo && showMeaningClue) || infoFallbackMeaning ? (
            <span className="text-2xl font-bold text-foreground">{meaning || "—"}</span>
          ) : null}
          {!isReading && onKunLine && <span className="text-base text-muted-foreground" lang="ja">{onKunLine}</span>}
          {showExtra && <span className="text-base font-semibold text-rose-600 dark:text-rose-400">{hanViet}</span>}
          {!isInfo && !isReading && showMeaningClue && <span className="text-base text-muted-foreground">{meaning}</span>}
          {showNotes && <span className="text-xs text-muted-foreground">{notes}</span>}
        </div>

        {/* options */}
        <div className={cn("grid gap-3", isReading ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2")}>
          {current.options.map((o) => {
            if (isReading) {
              const resolved = answered != null;
              const pickedThis = picks.has(o.id);
              // Before "Kiểm tra": a pick is just a neutral selection (no
              // correct/wrong colour leaked). After: green = valid, red = a
              // wrong pick, faint = a valid reading that was missed.
              let tone: string;
              if (!resolved) {
                tone = pickedThis
                  ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-border bg-card hover:border-rose-400";
              } else if (o.correct) {
                tone = pickedThis
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-emerald-500/60 text-emerald-700 dark:text-emerald-300";
              } else {
                tone = pickedThis
                  ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-border bg-card opacity-40";
              }
              return (
                <button
                  key={o.id}
                  // A reading option is not a kanji, so there's nothing to
                  // inspect on tap — only toggle the pick before submitting.
                  // (The current kanji stays inspectable via the prompt glyph.)
                  onClick={() => { if (!resolved) toggleReading(o); }}
                  className={cn("rounded-xl border px-2 py-3 text-center font-serif text-lg transition-colors min-h-[52px] flex items-center justify-center", tone)}
                  lang="ja"
                >
                  {o.label}
                </button>
              );
            }
            const reveal = answered != null;
            const chosen = answered === o.id;
            const tone = !reveal
              ? "border-border bg-card hover:border-rose-400"
              : o.correct
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : chosen
                  ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-border bg-card opacity-50";
            return (
              <button
                key={o.id}
                disabled={reveal && !inspectOnTap}
                onClick={() => {
                  if (answered == null) return answer(o.id, o.correct);
                  if (!inspectOnTap) return;
                  openKanjiInfo(o.glyph ? (charToId.get(o.label) ?? current.kanji.id) : current.kanji.id);
                }}
                className={cn(
                  "rounded-xl border px-4 py-4 text-center transition-colors min-h-[64px] flex items-center justify-center",
                  o.glyph ? "font-serif text-3xl" : "text-sm font-medium",
                  tone
                )}
                lang={o.glyph ? "ja" : undefined}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {isReading && answered == null && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={checkReading}
              disabled={picks.size === 0}
              className="w-full rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              KIỂM TRA
            </button>
            <button
              onClick={() => { setAnswered(RESOLVED); commitResult(false); }}
              className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:border-rose-400 hover:text-foreground"
            >
              CHƯA BIẾT
            </button>
          </div>
        )}

        {inspectOnTap && !isReading && (
          <p className="mt-4 text-center text-xs text-muted-foreground">Chạm vào đáp án để xem chi tiết Hán tự</p>
        )}

        {answered != null && settings.pauseAfterAnswer && (
          <button
            onClick={advance}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white hover:bg-rose-600"
          >
            <Play size={16} /> Tiếp tục
          </button>
        )}

        {/* "Hiện ví dụ" — available in every quiz type, but only once the
            question has been answered (so it never leaks the answer). */}
        {answered != null && current.kanji.character && (
          <div className="mt-4">
            <button
              onClick={() => setShowExamples((v) => !v)}
              className={cn(
                "mx-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                showExamples ? "border-rose-400 text-rose-600 dark:text-rose-400" : "border-border text-muted-foreground hover:border-rose-400"
              )}
            >
              {showExamples ? "Ẩn ví dụ" : "Hiện ví dụ"}
            </button>
            {showExamples && (
              <div className="mx-auto mt-3 w-full max-w-md">
                <KanjiReadingExamplesPanel character={current.kanji.character} blank={false} onWordClick={openWordInfo} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* stop / pause dialog — finish (partial results) · save & exit · resume */}
      {paused && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPaused(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-lg font-semibold text-foreground">Tạm ngưng</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Đã trả lời</dt>
                <dd className="font-semibold text-foreground tabular-nums">{answeredCount} / {total}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Độ chính xác</dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Thời gian</dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {String(Math.floor(elapsed / 60)).padStart(1, "0")}:{String(elapsed % 60).padStart(2, "0")}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  // Nothing answered yet → quit straight to the study settings;
                  // otherwise finish as before (the results screen submits).
                  if (answeredCount === 0) {
                    clearSession("QUIZ", Number(deckId), groupIndex);
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
      )}
    </KanjiLayout>
  );
}

/* ── small presentational helpers ───────────────────────────────────────── */

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
