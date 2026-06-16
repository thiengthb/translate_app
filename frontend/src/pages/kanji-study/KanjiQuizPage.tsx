import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, CheckSquare, Clock, LayoutGrid, List, Pause, Play,
  RotateCcw, Square, Target, X,
} from "lucide-react";
import { kanjiDeckApi, kanjiStudyApi, kanjiVocabularyApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO } from "@/types";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { KanjiLayout } from "./components/KanjiLayout";
import { useAllKanjiDetails, useDeckKanji } from "./hooks/useDeckKanji";

/**
 * Trắc nghiệm (quiz) runner — the four question directions from the mobile app:
 *
 * - **info-kanji**     (Thông tin → Kanji): meaning + readings → pick the kanji
 * - **kanji-meaning**  (Kanji → Nghĩa):     kanji → pick the meaning
 * - **kanji-reading**  (Kanji → Cách đọc):  kanji → pick a reading
 * - **example-kanji**  (Ví dụ → Kanji):     an example word with the kanji blanked → pick the kanji
 *
 * Flow: setup (type + count) → play (multiple choice, ✓/✗ tally, per-question
 * timer, feedback) → results (per-kanji correct/wrong, replay/finish).
 *
 * Vietnamese meaning is preferred (`meaningVi`) and falls back to English
 * (`meaning`) until `meaning_vi` is populated. Distractors are drawn from the
 * deck (then the cached kanji set) so options stay plausible. Everything is
 * client-side for now; persisting sessions/accuracy is the next phase.
 */

type QuizType = "info-kanji" | "kanji-meaning" | "kanji-reading" | "example-kanji";

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
  promptKanji?: string;
  promptText?: string;
  readings?: string;
  meaning?: string;
  exampleWord?: string;
  exampleReading?: string;
  options: QOption[];
}

const DONT_KNOW = "__dont_know__";

/* ── helpers ──────────────────────────────────────────────────────────── */

const meaningOf = (k: KanjiDetailDTO) => (k.meaningVi || k.meaning || "").trim();
const readingsLine = (k: KanjiDetailDTO) => [k.onyomi, k.kunyomi].filter(Boolean).join("　");

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

/** Reading tokens (okurigana / inflection markers stripped) for the reading quiz. */
function readingTokens(k: KanjiDetailDTO): string[] {
  const out: string[] = [];
  for (const raw of [k.onyomi, k.kunyomi]) {
    if (!raw) continue;
    for (const tok of raw.split(/[、,，/・\s]+/)) {
      const t = tok.trim();
      if (!t) continue;
      const stem = t.split(/[.\-（(~～]/)[0].trim();
      if (stem) out.push(stem);
    }
  }
  return [...new Set(out)];
}

function buildSyncQuestion(
  kanji: KanjiDetailDTO,
  type: Exclude<QuizType, "example-kanji">,
  pool: KanjiDetailDTO[]
): Question {
  if (type === "kanji-meaning") {
    const correct = meaningOf(kanji);
    const distractors = [
      ...new Set(pool.map(meaningOf).filter((m) => m && m !== correct)),
    ];
    const labels = shuffle([correct, ...shuffle(distractors).slice(0, 5)]);
    return {
      kanji,
      type,
      promptKanji: kanji.character,
      readings: readingsLine(kanji),
      options: labels.map((label, i) => ({ id: String(i), label, correct: label === correct })),
    };
  }

  if (type === "info-kanji") {
    const correct = kanji.character ?? "";
    const distractors = [
      ...new Set(pool.map((k) => k.character ?? "").filter((c) => c && c !== correct)),
    ];
    const labels = shuffle([correct, ...shuffle(distractors).slice(0, 7)]);
    return {
      kanji,
      type,
      promptText: meaningOf(kanji),
      readings: readingsLine(kanji),
      options: labels.map((label, i) => ({ id: String(i), label, correct: label === correct, glyph: true })),
    };
  }

  // kanji-reading
  const correctSet = new Set(readingTokens(kanji));
  const correct = [...correctSet][0] ?? "";
  const distractors = [
    ...new Set(pool.flatMap(readingTokens).filter((r) => r && !correctSet.has(r))),
  ];
  const labels = shuffle([correct, ...shuffle(distractors).slice(0, 7)]);
  return {
    kanji,
    type: "kanji-reading",
    promptKanji: kanji.character,
    meaning: meaningOf(kanji),
    options: labels.map((label, i) => ({ id: String(i), label, correct: correctSet.has(label) })),
  };
}

/* ── page ─────────────────────────────────────────────────────────────── */

export default function KanjiQuizPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [params] = useSearchParams();
  const groupParam = params.get("group");
  const groupIndex = groupParam != null && groupParam !== "" ? Number(groupParam) : null;
  const navigate = useNavigate();

  const queryClient = useQueryClient();
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

  const groupLabel = useMemo(() => {
    if (groupIndex == null) return null;
    const order: number[] = [];
    for (const k of deckKanji) if (!order.includes(k.groupIndex)) order.push(k.groupIndex);
    const pos = order.indexOf(groupIndex);
    return pos >= 0 ? `Nhóm ${pos + 1}` : null;
  }, [deckKanji, groupIndex]);

  const [phase, setPhase] = useState<"setup" | "preparing" | "playing" | "results">("setup");
  const [type, setType] = useState<QuizType>("kanji-meaning");
  const [count, setCount] = useState(10);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0); // whole-session seconds
  const [saved, setSaved] = useState(false);
  const [resultView, setResultView] = useState<"list" | "grid">("list");
  const [resultSort, setResultSort] = useState<"order" | "wrong" | "correct">("order");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const submittedRef = useRef(false);

  const askCount = Math.min(count, subjects.length);

  // Session timer.
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const start = async (override?: KanjiDetailDTO[]) => {
    const picked = override ?? shuffle(subjects).slice(0, askCount);
    if (picked.length === 0) return;

    let qs: Question[];
    if (type === "example-kanji") {
      setPhase("preparing");
      qs = [];
      for (const k of picked) {
        let made: Question | null = null;
        if (k.character) {
          try {
            const res = await kanjiVocabularyApi.words(k.character, 0, 1);
            const w = res.items?.[0];
            if (w?.word) {
              const distractors = [
                ...new Set(pool.map((p) => p.character ?? "").filter((c) => c && c !== k.character)),
              ];
              const labels = shuffle([k.character, ...shuffle(distractors).slice(0, 7)]);
              made = {
                kanji: k,
                type: "example-kanji",
                exampleWord: w.word.split(k.character).join("◯"),
                exampleReading: w.reading,
                options: labels.map((label, i) => ({ id: String(i), label, correct: label === k.character, glyph: true })),
              };
            }
          } catch {
            /* fall through to info-kanji */
          }
        }
        qs.push(made ?? buildSyncQuestion(k, "info-kanji", pool));
      }
    } else {
      qs = picked.map((k) => buildSyncQuestion(k, type, pool));
    }

    setQuestions(qs);
    setResults([]);
    setIndex(0);
    setAnswered(null);
    setElapsed(0);
    setPaused(false);
    setSaved(false);
    setSelectMode(false);
    setSelected(new Set());
    submittedRef.current = false;
    startedAtRef.current = new Date().toISOString();
    setPhase("playing");
  };

  // Save the finished session once (also drives the stats header next time).
  useEffect(() => {
    if (phase !== "results" || submittedRef.current) return;
    submittedRef.current = true;
    const items = questions
      .map((q, i) => ({ kanjiId: q.kanji.id as number, correct: !!results[i] }))
      .filter((x) => x.kanjiId != null);
    if (items.length === 0) return;
    kanjiStudyApi
      .submit({ deckId: Number(deckId), groupIndex, mode: "QUIZ", startedAt: startedAtRef.current, items })
      .then(() => {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: ["kanji-quiz-stats", deckId, groupIndex] });
        queryClient.invalidateQueries({ queryKey: ["kanji-recent-sessions"] });
      })
      .catch((e) => logger.error("quiz submit failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const current = questions[index];

  const answer = (optId: string, correct: boolean) => {
    if (answered != null) return;
    setAnswered(optId);
    setResults((r) => {
      const next = [...r];
      next[index] = correct;
      return next;
    });
    advanceTimer.current = setTimeout(advance, 1100);
  };

  const advance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setAnswered(null);
    if (index >= questions.length - 1) setPhase("results");
    else setIndex((i) => i + 1);
  };

  const correctCount = results.filter(Boolean).length;
  const wrongCount = results.filter((r) => r === false).length;

  /* ── render ─────────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <KanjiLayout>
        <p className="text-muted-foreground max-w-2xl mx-auto">Đang tải...</p>
      </KanjiLayout>
    );
  }

  if (phase === "setup" || phase === "preparing") {
    return (
      <KanjiLayout>
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

          <div className="flex items-center justify-between gap-3 mb-8">
            <span className="text-sm font-medium text-foreground">Số câu hỏi</span>
            <div className="flex gap-2">
              {[10, 20, subjects.length].map((n, i) => {
                const label = i === 2 ? "Tất cả" : String(n);
                const active = count === n || (i === 2 && count >= subjects.length);
                return (
                  <button
                    key={label}
                    onClick={() => setCount(n)}
                    disabled={n > subjects.length && i !== 2}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-30",
                      active
                        ? "bg-rose-500 text-white border-rose-500"
                        : "border-border text-foreground hover:border-rose-400"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => start()}
            disabled={phase === "preparing" || askCount === 0}
            className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Bắt đầu"
          >
            {phase === "preparing" ? (
              <span className="h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
            ) : (
              <Play size={28} className="ml-1" />
            )}
          </button>
          {phase === "preparing" && (
            <p className="text-center text-xs text-muted-foreground mt-3">Đang chuẩn bị câu hỏi...</p>
          )}
        </div>
      </KanjiLayout>
    );
  }

  if (phase === "results") {
    const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const sortedResultIdx = (() => {
      const idx = questions.map((_, i) => i);
      if (resultSort === "wrong") return [...idx].sort((a, b) => Number(!!results[a]) - Number(!!results[b]));
      if (resultSort === "correct") return [...idx].sort((a, b) => Number(!!results[b]) - Number(!!results[a]));
      return idx;
    })();
    const toggleSelect = (i: number) =>
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(i)) n.delete(i);
        else n.add(i);
        return n;
      });
    return (
      <KanjiLayout>
        <div className="max-w-2xl mx-auto w-full pb-28">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 text-center">
            <p className="text-sm font-semibold text-white/80">Kết quả</p>
            <p className="mt-1 text-5xl font-extrabold">{pct}%</p>
            <p className="mt-1 text-white/90">
              Đúng {correctCount} · Sai {wrongCount} / {questions.length}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/80">
              {saved ? <><Check size={13} /> Đã lưu phiên học</> : "Đang lưu..."}
            </p>
          </div>

          {/* toolbar: sort · view · select */}
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
                onClick={() => setSelected(new Set(questions.map((_, i) => i)))}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:border-rose-400"
              >
                Chọn tất cả
              </button>
              <button
                disabled={selected.size === 0}
                onClick={() =>
                  start([...selected].sort((a, b) => a - b).map((i) => questions[i].kanji))
                }
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

  return (
    <KanjiLayout>
      <div className="max-w-2xl mx-auto w-full pb-10">
        {/* top bar */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate(`/kanji-study/deck/${deckId}`)}
            className="text-muted-foreground hover:text-foreground"
            title="Thoát"
          >
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
            onClick={() => setPaused((p) => !p)}
            className="text-muted-foreground hover:text-foreground"
            title={paused ? "Tiếp tục" : "Tạm dừng"}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </div>

        {/* progress */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums mb-6">
          {index + 1} <span className="text-muted-foreground font-normal">/ {total}</span>
        </p>

        {/* prompt */}
        <div className="min-h-[160px] flex flex-col items-center justify-center text-center gap-3 mb-8">
          {current.promptKanji && (
            <span className="font-serif text-7xl leading-none text-foreground" lang="ja">
              {current.promptKanji}
            </span>
          )}
          {current.promptText && (
            <span className="text-2xl font-bold text-foreground">{current.promptText || "—"}</span>
          )}
          {current.exampleWord && (
            <span className="flex flex-col items-center gap-1">
              {current.exampleReading && (
                <span className="text-sm text-muted-foreground" lang="ja">【{current.exampleReading}】</span>
              )}
              <span className="font-serif text-5xl leading-none text-foreground" lang="ja">
                {current.exampleWord}
              </span>
            </span>
          )}
          {current.readings && (
            <span className="text-base text-muted-foreground" lang="ja">{current.readings}</span>
          )}
          {current.meaning && <span className="text-base text-muted-foreground">{current.meaning}</span>}
        </div>

        {/* options */}
        <div className="grid grid-cols-2 gap-3">
          {current.options.map((o) => {
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
                disabled={reveal}
                onClick={() => answer(o.id, o.correct)}
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

        {current.type === "kanji-reading" && (
          <button
            disabled={answered != null}
            onClick={() => answer(DONT_KNOW, false)}
            className="mt-4 w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:border-rose-400 hover:text-foreground disabled:opacity-50"
          >
            CHƯA BIẾT
          </button>
        )}
      </div>

      {paused && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setPaused(false)}>
          <div className="rounded-2xl bg-card border border-border px-8 py-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold text-foreground mb-3">Tạm dừng</p>
            <button
              onClick={() => setPaused(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"
            >
              <Play size={16} /> Tiếp tục
            </button>
          </div>
        </div>
      )}
    </KanjiLayout>
  );
}
