import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight, AlertTriangle, BookOpen, Volume2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { KanaInput } from "@/components/grammar/KanaInput";
import { productionApi, type ExerciseResponse } from "@/api/features/production.api";
import {
  grammarLearnApi,
  type SessionItem,
  type SessionResponse,
  type ReviewResponse,
  type ClozeQuestion,
  type ClozeResult,
  type GoalSnapshot,
  type GrammarDetail,
} from "@/api/features/grammar/grammar-learn.api";
import { VERDICT_LABEL, VERDICT_STYLE } from "@/pages/production/production-constants";
import { JpText } from "@/components/grammar/JpText";
import { FuriganaToggle } from "@/components/grammar/FuriganaToggle";
import { useFurigana } from "@/hooks/useFurigana";
import { speakJa, stopJa } from "@/lib/jp-speech";
import { comboPop, countUp, enterCards, fillProgress, lightningStrike, pop, reveal, shake } from "./grammar-anim";

type Phase = "loading" | "intro" | "practice" | "result";
type Mode = "cloze" | "free";

/** A REVIEW card with interval ≥ this many days is "mastered" — matches the backend. */
const MASTERED_INTERVAL_DAYS = 21;

/**
 * Whether a grammar point has matured enough to drill in PRODUCTION (free-write)
 * rather than RECOGNITION (cloze). Driven by the point's own grammar SRS, not vocab SRS.
 */
function isMaturedForProduction(item: SessionItem): boolean {
  return item.state === "REVIEW" && (item.intervalDays ?? 0) >= MASTERED_INTERVAL_DAYS;
}

/** Streak threshold at which celebrations begin. */
const STREAK_MIN = 3;

/**
 * Full-screen streak celebration overlay (pointer-events-none): a combo label pops on
 * every correct answer once the streak hits {@link STREAK_MIN}, and a lightning strike
 * flashes top→bottom at each multiple-of-5 milestone. No-ops under reduced motion.
 */
function StreakBurst({ trigger }: { trigger: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger < STREAK_MIN) return;
    comboPop(comboRef.current);
    if (trigger % 5 === 0) lightningStrike(rootRef.current);
  }, [trigger]);

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <div
        data-fx="flash"
        className="absolute inset-0 opacity-0 bg-gradient-to-b from-amber-300 via-amber-200/40 to-transparent"
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
        <path
          data-fx="bolt"
          d="M54 -2 L40 38 L56 40 L36 102"
          stroke="rgb(251 191 36)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity="0"
          style={{ filter: "drop-shadow(0 0 6px rgb(251 191 36))" }}
        />
      </svg>
      <div ref={comboRef} className="absolute left-1/2 top-[20%] -translate-x-1/2 text-center" style={{ opacity: 0 }}>
        <div className="text-5xl font-black text-amber-500 drop-shadow">🔥 {trigger}</div>
        <div className="text-sm font-semibold text-amber-600">chuỗi đúng!</div>
      </div>
    </div>
  );
}

export default function GrammarSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const level = searchParams.get("level") ?? undefined;
  const extra = searchParams.get("extra") === "1";
  const challenge = searchParams.get("challenge") === "1"; // force free-write (no cloze)
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<SessionResponse | null>(null);

  // Session size is driven by the user's saved daily goal (see Dashboard).
  const [goal, setGoal] = useState<GoalSnapshot | null>(null);

  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("free");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [masteredGain, setMasteredGain] = useState(0);
  const [streak, setStreak] = useState(0); // consecutive correct answers this session

  // lesson-first for NEW items: show the grammar point before quizzing it
  const [lesson, setLesson] = useState<GrammarDetail | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);

  // cloze
  const [cloze, setCloze] = useState<ClozeQuestion | null>(null);
  const [clozeResult, setClozeResult] = useState<ClozeResult | null>(null);
  const [attemptNo, setAttemptNo] = useState(1);
  const [showHint, setShowHint] = useState(false);

  // free-write
  const [exercise, setExercise] = useState<ExerciseResponse | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);

  // anime.js animation roots (see grammar-anim.ts)
  const introRef = useRef<HTMLDivElement>(null);
  const practiceRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const clozeInputRef = useRef<HTMLInputElement>(null);

  const fx = (sel: string) =>
    practiceRef.current?.querySelector<HTMLElement>(`[data-fx="${sel}"]`) ?? null;

  // Furigana for every Japanese string the current item can show across phases
  // (lesson example, cloze sentence + reveal, free-write model answer). Batched
  // and cached by useFurigana; fetched incrementally as each phase populates.
  const furi = useFurigana([
    lesson?.exampleJp,
    cloze?.masked,
    clozeResult?.fullSentence,
    result?.referenceAnswer,
  ]);

  const resetItemState = () => {
    setAnswer("");
    setSubmitted("");
    setLesson(null);
    setLessonOpen(false);
    setCloze(null);
    setClozeResult(null);
    setAttemptNo(1);
    setShowHint(false);
    setExercise(null);
    setResult(null);
  };

  const loadItem = useCallback(async (item: SessionItem) => {
    resetItemState();
    setGenerating(true);
    try {
      // Bunpro-style lesson-first: a brand-new grammar point is shown (structure,
      // nuance, example) before the learner is quizzed on it. The exercise keeps
      // loading underneath, so "Luyện tập" is instant.
      if (item.kind === "NEW") {
        grammarLearnApi
          .detail(item.subUseId)
          .then((d) => {
            setLesson(d);
            setLessonOpen(true);
          })
          .catch(() => {}); // lesson is optional — quiz straight away if it fails
      }

      // Exercise mode follows the grammar point's OWN SRS maturity (not vocab SRS):
      // recognition first (cloze) while still learning, production (free-write) once the
      // point is mastered. Challenge mode always forces free-write. A long-interval
      // REVIEW card (>= the backend's mastered threshold) graduates to free-write.
      if (challenge || isMaturedForProduction(item)) {
        setMode("free");
        setExercise(await productionApi.getExercise(item.subUseId));
        return;
      }

      // Still learning → prefer a deterministic cloze, fall back to free-write only
      // when no cloze can be built for this point.
      const c = await grammarLearnApi.cloze(item.subUseId);
      if (c?.hasCloze) {
        setMode("cloze");
        setCloze(c);
      } else {
        setMode("free");
        setExercise(await productionApi.getExercise(item.subUseId));
      }
    } catch {
      // cloze failed → try free-write before giving up
      try {
        setMode("free");
        setExercise(await productionApi.getExercise(item.subUseId));
      } catch {
        toast.error(`Không tạo được câu cho "${item.name}". Bỏ qua.`);
        setExercise(null);
      }
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge]);

  const fetchSession = useCallback(async () => {
    setPhase("loading");
    setStreak(0); // fresh session → reset the combo
    try {
      const [s, g] = await Promise.all([
        grammarLearnApi.session(level, extra || challenge),
        grammarLearnApi.getGoal(),
      ]);
      setSession(s);
      setGoal(g);
      // No confirmation step — jump straight into practice. The intro screen
      // remains only for the "goal met / nothing left" case.
      if (s.items.length > 0) {
        setIndex(0);
        setPhase("practice");
        void loadItem(s.items[0]);
      } else {
        setPhase("intro");
      }
    } catch {
      toast.error("Không tải được phiên học.");
      setPhase("intro");
    }
  }, [level, extra, challenge, loadItem]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  // Stop any audio still playing when leaving the session.
  useEffect(() => () => stopJa(), []);

  // Warn before a refresh / tab-close that would drop an in-progress session.
  // "In progress" = practicing AND past the first untouched question (nothing to lose
  // on a fresh item 0). Answered items are already saved to SRS server-side; this only
  // guards the session's in-flight position. SPA nav (sidebar/back) can't be blocked
  // cleanly under <BrowserRouter> without a data-router migration.
  const sessionDirty =
    phase === "practice" && (index > 0 || !!submitted || answer.trim().length > 0);
  useEffect(() => {
    if (!sessionDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [sessionDirty]);

  // "Học tiếp" after finishing: load a fresh session in place (no full-page reload,
  // which would flash and drop SPA state). Resets the per-session mastered counter.
  const restart = useCallback(() => {
    setMasteredGain(0);
    void fetchSession();
  }, [fetchSession]);

  // Refresh goal progress when the session ends so the result screen reflects
  // what this session just contributed to today's goal.
  useEffect(() => {
    if (phase === "result") {
      grammarLearnApi.getGoal().then(setGoal).catch(() => {});
    }
  }, [phase]);

  // ── anime.js choreography ──
  // Intro: cards rise in as the session summary appears.
  useEffect(() => {
    if (phase === "intro") enterCards(introRef.current);
  }, [phase, session]);

  // Practice: each new question / lesson staggers its cards in,
  // and the progress bar advances to the current position.
  useEffect(() => {
    if (phase !== "practice" || generating) return;
    enterCards(practiceRef.current);
  }, [phase, generating, index, lessonOpen, mode]);

  useEffect(() => {
    const total = session?.items.length ?? 0;
    if (phase === "practice" && total > 0) {
      fillProgress(progressRef.current, index / total);
    }
  }, [phase, index, session]);

  // Start each new question at the top — after a long feedback reveal, "Tiếp tục"
  // would otherwise drop the learner mid-page on the next item.
  useEffect(() => {
    if (phase === "practice") practiceRef.current?.scrollIntoView({ block: "start" });
  }, [index, phase]);

  // Auto-focus the cloze input as each question loads so the learner can type
  // immediately (no click needed). The element persists across items, so autoFocus
  // alone won't re-fire — this effect handles every subsequent question.
  useEffect(() => {
    const notGraded = !clozeResult || clozeResult.status === "WARN";
    if (mode === "cloze" && cloze && notGraded && !generating) {
      clozeInputRef.current?.focus();
    }
  }, [cloze, clozeResult, mode, generating]);

  // Cloze feedback: correct pops the verdict badge, wrong shakes the answer box.
  useEffect(() => {
    if (!clozeResult) return;
    if (clozeResult.status === "CORRECT") {
      reveal(fx("result"));
      pop(fx("verdict"));
    } else if (clozeResult.status === "WARN") {
      shake(fx("answer"));
    } else {
      reveal(fx("result"));
      shake(fx("answer"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clozeResult]);

  // Free-write feedback: same idea, driven by the holistic verdict.
  useEffect(() => {
    if (!result) return;
    reveal(fx("result"));
    if (result.finalVerdict === "PASS") pop(fx("verdict"));
    else shake(fx("answer"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Completion: trophy pops, progress bar completes, counters tick up.
  useEffect(() => {
    if (phase !== "result" || !resultRef.current) return;
    enterCards(resultRef.current);
    pop(resultRef.current.querySelector<HTMLElement>('[data-fx="trophy"]'));
    countUp(
      resultRef.current.querySelector<HTMLElement>('[data-fx="mastered"]'),
      masteredGain,
      "+",
    );
    countUp(
      resultRef.current.querySelector<HTMLElement>('[data-fx="review"]'),
      session?.reviewCount ?? 0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const bumpMastered = (state: string | null, interval: number | null) => {
    if (state === "REVIEW" && (interval ?? 0) >= 21) setMasteredGain((m) => m + 1);
  };

  const submitCloze = async () => {
    if (!cloze?.referenceSentenceId || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await grammarLearnApi.clozeReview(
        cloze.referenceSentenceId,
        answer,
        attemptNo,
      );
      setClozeResult(res);
      if (res.status === "WARN") {
        setAttemptNo((n) => n + 1); // forgiven, let them retry — streak unchanged
      } else {
        setSubmitted(answer);
        bumpMastered(res.state, res.intervalDays);
        setStreak((s) => (res.status === "CORRECT" ? s + 1 : 0));
      }
    } catch {
      toast.error("Chấm bài thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFree = async () => {
    if (!exercise || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await grammarLearnApi.review(exercise.promptId, answer);
      setSubmitted(answer);
      setResult(res);
      bumpMastered(res.state, res.intervalDays);
      setStreak((s) => (res.finalVerdict === "PASS" ? s + 1 : 0));
    } catch {
      toast.error("Chấm bài thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!session) return;
    const ni = index + 1;
    if (ni >= session.items.length) {
      setPhase("result");
      return;
    }
    setIndex(ni);
    void loadItem(session.items[ni]);
  };

  // ── done flag per mode ──
  const clozeDone = !!clozeResult && clozeResult.status !== "WARN";
  const clozeWarn = clozeResult?.status === "WARN";

  // Leaving an in-progress session is confirmed (answered items are saved server-side;
  // only the in-flight position is lost). Used by the focus-mode back button.
  const handleExit = () => {
    if (
      sessionDirty &&
      !window.confirm(
        "Phiên học đang dở — thoát sẽ mất tiến độ của phiên này. (Các câu đã trả lời vẫn được lưu.) Thoát?",
      )
    ) {
      return;
    }
    navigate("/grammar");
  };

  // Enter advances to the next item once the current answer has been graded — matches
  // the on-screen "Tiếp tục" button so the keyboard flow never stalls.
  useEffect(() => {
    const graded = (mode === "cloze" && clozeDone) || (mode === "free" && !!result);
    if (phase !== "practice" || !graded) return;
    const onKey = (e: KeyboardEvent) => {
      // Let a focused button handle its own Enter (avoids double-advancing).
      if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, clozeDone, result, index, session]);

  // ── Render ──
  if (phase === "loading") {
    return (
      <MainLayout pathName={{ "/grammar/learn": "Phiên học" }} focus onBack={handleExit} pageScroll>
        <div className="flex justify-center h-60 items-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </MainLayout>
    );
  }

  // Intro is now only the "nothing to do" screen — sessions with content start
  // practicing immediately (see fetchSession).
  if (phase === "intro" && session) {
    return (
      <MainLayout pathName={{ "/grammar/learn": "Phiên học" }} focus onBack={handleExit} pageScroll>
        <div ref={introRef} className="w-full max-w-xl flex flex-col gap-5">
          <h1 className="text-xl font-bold">
            {challenge ? "Thử thách" : "Phiên học hôm nay"}
            {level ? ` · ${level}` : ""}
            {extra && !challenge ? " · Học thêm" : ""}
          </h1>
          {challenge && (
            <p className="text-sm text-muted-foreground -mt-2">
              Tự dịch câu từ trống — không có chỗ điền sẵn.
            </p>
          )}

          {goal && (
            <Card data-anim="card" className="p-4 flex-row flex-wrap items-center gap-4 text-sm">
              <span>
                🎯 Mục tiêu hôm nay:{" "}
                <b>{goal.newDoneToday}/{goal.newPerDay}</b> mới ·{" "}
                <b>{goal.reviewsDoneToday}/{goal.reviewsPerDay}</b> ôn
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => navigate("/grammar")}
              >
                Chỉnh mục tiêu
              </Button>
            </Card>
          )}

          <Card data-anim="card" className="p-6 gap-4">
            <p className="text-sm text-muted-foreground">
              {extra
                ? "Hết sạch bài để học rồi — bạn quá chăm! 🎉"
                : "Bạn đã hoàn thành mục tiêu hôm nay 🎉 Muốn học thêm thì cứ tự nhiên!"}
            </p>
            {!extra && (
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/grammar/learn?extra=1${level ? `&level=${level}` : ""}`)}
                >
                  Học thêm (vượt mục tiêu)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/grammar/learn?challenge=1${level ? `&level=${level}` : ""}`)}
                >
                  Thử thách
                </Button>
              </div>
            )}
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (phase === "result" && session) {
    return (
      <MainLayout pathName={{ "/grammar/learn": "Phiên học" }} focus onBack={handleExit} pageScroll>
        <div ref={resultRef} className="w-full max-w-xl flex flex-col gap-5">
          <Card data-anim="card" className="p-8 gap-4 items-center text-center">
            <span data-fx="trophy" className="inline-flex">
              <CheckCircle2 className="text-green-600" size={48} />
            </span>
            <div className="text-lg font-bold">Hoàn thành</div>
            <div className="text-sm text-muted-foreground">
              {session.items.length} / {session.items.length} câu
            </div>
            <div className="flex gap-6 text-sm pt-2">
              <span>Đã thành thạo: <b data-fx="mastered" className="text-foreground">+{masteredGain}</b></span>
              <span>Ôn tập: <b data-fx="review" className="text-foreground">{session.reviewCount}</b></span>
            </div>
            {goal && (
              <div className="text-sm text-muted-foreground">
                🎯 Hôm nay:{" "}
                <b className="text-foreground">{goal.newDoneToday}/{goal.newPerDay}</b> mới ·{" "}
                <b className="text-foreground">{goal.reviewsDoneToday}/{goal.reviewsPerDay}</b> ôn
                {goal.newRemaining === 0 && goal.reviewsRemaining === 0 && (
                  <span> — đạt mục tiêu! 🏆</span>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={() => navigate("/grammar")}>Về trang chủ</Button>
              <Button variant="outline" onClick={restart}>Học tiếp</Button>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // phase === "practice"
  const item = session?.items[index];
  const isLast = index + 1 >= (session?.items.length ?? 0);

  return (
    <MainLayout pathName={{ "/grammar/learn": "Phiên học" }} focus onBack={handleExit} pageScroll>
      <StreakBurst trigger={streak} />
      <div ref={practiceRef} className="w-full max-w-xl flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            Câu {index + 1} / {session?.items.length}
            {streak >= 2 && (
              <span className="font-semibold text-amber-500">🔥 {streak}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <FuriganaToggle />
            {item && (
              <Badge variant={item.kind === "NEW" ? "default" : "secondary"}>
                {item.kind === "NEW" ? "Bài mới" : "Ôn tập"}
              </Badge>
            )}
            {!generating && !lessonOpen && (
              <Badge variant="outline">{mode === "cloze" ? "Điền chỗ trống" : "Tự viết câu"}</Badge>
            )}
            {lessonOpen && <Badge variant="outline">Bài học</Badge>}
          </div>
        </div>

        {/* Session progress, animated by anime.js on each advance */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div ref={progressRef} className="h-full rounded-full bg-primary" style={{ width: 0 }} />
        </div>

        {lessonOpen && lesson ? (
          /* ── LESSON (new grammar point — learn before the quiz) ── */
          <>
            <Card data-anim="card" className="p-6 gap-4">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-primary shrink-0" />
                <span className="text-lg font-bold">{lesson.name}</span>
                {lesson.jlptLevel && <Badge variant="secondary">{lesson.jlptLevel}</Badge>}
              </div>
              {lesson.structurePattern && (
                <div className="rounded-md bg-muted/60 px-4 py-2 text-sm font-medium">
                  {lesson.structurePattern}
                </div>
              )}
              {lesson.nuanceDescription && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lesson.nuanceDescription}
                </p>
              )}
              {lesson.exampleJp && (
                <div className="border-l-4 border-primary/40 pl-4 py-1">
                  <div className="flex items-start gap-2">
                    <p className="text-base leading-loose">
                      <JpText text={lesson.exampleJp} segments={furi[lesson.exampleJp]} />
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 rounded-full text-primary"
                      onClick={() => speakJa(lesson.exampleJp!)}
                      aria-label="Đọc câu ví dụ"
                    >
                      <Volume2 size={14} />
                    </Button>
                  </div>
                  {lesson.exampleVi && (
                    <p className="text-sm text-muted-foreground mt-1">{lesson.exampleVi}</p>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button onClick={() => setLessonOpen(false)} className="gap-1">
                  Luyện tập <ArrowRight size={16} />
                </Button>
                <Button variant="ghost" onClick={next}>Để sau</Button>
              </div>
            </Card>
          </>
        ) : generating ? (
          <Card className="p-6 h-40 flex-row items-center justify-center gap-3">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="text-sm text-muted-foreground">Đang tạo câu…</span>
          </Card>
        ) : mode === "cloze" && cloze ? (
          /* ── CLOZE ── */
          <>
            {/* Single integrated card: prompt + sentence + inline answer field. */}
            <Card data-anim="card" data-fx="answer" className="p-6 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{cloze.jlptLevel}</Badge>
                {/* Grammar name is the answer — keep it hidden until requested. */}
                {showHint || clozeDone ? (
                  <span className="text-sm font-medium">{cloze.subUseName}</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setShowHint(true)}
                  >
                    Gợi ý
                  </Button>
                )}
              </div>
              {cloze.l1Text && (
                <p className="text-sm text-muted-foreground">{cloze.l1Text}</p>
              )}
              {/* Clicking the sentence (or its blank) focuses the answer field. */}
              <p
                className="text-xl leading-loose tracking-wide cursor-text"
                onClick={() => clozeInputRef.current?.focus()}
              >
                {cloze.masked ? <JpText text={cloze.masked} segments={furi[cloze.masked]} /> : null}
              </p>

              {/* Integrated underline field — auto-focused, Tab/click reach it too. */}
              <KanaInput
                ref={clozeInputRef}
                value={answer}
                onChange={setAnswer}
                placeholder="Gõ romaji → hiragana…"
                disabled={submitting || clozeDone}
                autoFocus
                className="h-12 rounded-none border-0 border-b-2 bg-transparent px-1 text-center text-lg shadow-none focus-visible:border-primary focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting && !clozeDone && answer.trim()) submitCloze();
                }}
              />

              {clozeWarn && (
                <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-500/10 rounded-md p-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{clozeResult?.message}</span>
                </div>
              )}

              {!clozeDone ? (
                <div className="flex gap-3">
                  <Button onClick={submitCloze} disabled={submitting || !answer.trim()}>
                    {submitting && <Loader2 className="animate-spin" size={16} />}
                    {clozeWarn ? "Thử lại" : "Kiểm tra"}
                  </Button>
                  <Button variant="ghost" onClick={next} disabled={submitting}>Bỏ qua</Button>
                </div>
              ) : null}
            </Card>

            {clozeDone && clozeResult && (
              <Card data-fx="result" className="p-6 gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge data-fx="verdict" className={clozeResult.status === "CORRECT" ? VERDICT_STYLE.PASS : VERDICT_STYLE.FAIL}>
                    {clozeResult.status === "CORRECT" ? "Đúng" : "Chưa đúng"}
                  </Badge>
                  <span className="ml-auto text-sm">Lần ôn tới: <b>{clozeResult.goodPreview}</b></span>
                </div>
                {clozeResult.message && (
                  <p className="text-sm text-muted-foreground">{clozeResult.message}</p>
                )}
                <div className="border-l-4 border-green-600 bg-green-600/5 pl-4 py-2">
                  <div className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">Đáp án</div>
                  <p className="text-base"><b>{clozeResult.correctAnswer}</b></p>
                  {clozeResult.fullSentence && (
                    <div className="flex items-start gap-2 mt-1">
                      <p className="text-sm text-muted-foreground leading-loose">
                        <JpText text={clozeResult.fullSentence} segments={furi[clozeResult.fullSentence]} />
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 rounded-full text-primary"
                        onClick={() => speakJa(clozeResult.fullSentence!)}
                        aria-label="Đọc câu"
                      >
                        <Volume2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>
                {submitted && submitted !== clozeResult.correctAnswer && (
                  <div className="border-l-4 border-muted-foreground/30 pl-4 py-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Câu của bạn</div>
                    <p className="text-base">{submitted}</p>
                  </div>
                )}
                <Button onClick={next} className="gap-1">
                  {isLast ? "Hoàn thành" : "Tiếp tục"} <ArrowRight size={16} />
                </Button>
              </Card>
            )}
          </>
        ) : mode === "free" && exercise ? (
          /* ── FREE-WRITE ── */
          <>
            <Card data-anim="card" className="p-6 gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{exercise.jlptLevel}</Badge>
                <span className="text-sm font-medium">{exercise.subUseName}</span>
              </div>
              <pre className="whitespace-pre-wrap font-inter text-sm leading-relaxed">
                {exercise.l1Prompt}
              </pre>
              {exercise.words && exercise.words.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {exercise.words.map((w) => (
                    <Badge key={w} variant="secondary" className="font-normal">{w}</Badge>
                  ))}
                </div>
              )}
            </Card>

            <Card data-anim="card" data-fx="answer" className="p-6 gap-4">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Viết câu tiếng Nhật sử dụng mẫu ngữ pháp này…"
                rows={3}
                maxLength={1000}
                disabled={submitting || !!result}
              />
              {!result && (
                <div className="flex gap-3">
                  <Button onClick={submitFree} disabled={submitting || !answer.trim()}>
                    {submitting && <Loader2 className="animate-spin" size={16} />} Nộp bài
                  </Button>
                  <Button variant="ghost" onClick={next} disabled={submitting}>Bỏ qua</Button>
                </div>
              )}
            </Card>

            {result && (
              <Card data-fx="result" className="p-6 gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge data-fx="verdict" className={VERDICT_STYLE[result.finalVerdict]}>
                    {VERDICT_LABEL[result.finalVerdict] ?? result.finalVerdict}
                  </Badge>
                  <Badge variant={result.detectorPassed ? "secondary" : "outline"}>
                    {result.detectorPassed ? "✓ Dùng đúng mẫu" : "✗ Chưa dùng mẫu"}
                  </Badge>
                  <span className="ml-auto text-sm">Lần ôn tới: <b>{result.goodPreview}</b></span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span>Ngữ pháp: <b className="text-foreground">{result.detectorPassed ? "✓" : "✗"}</b></span>
                  {result.judgeScore != null && (
                    <span>Viết: <b className="text-foreground">{Math.round(result.judgeScore * 100)}</b></span>
                  )}
                  <span className="text-muted-foreground">→ {result.ratingApplied}</span>
                </div>
                {result.referenceAnswer && (
                  <div className="border-l-4 border-green-600 bg-green-600/5 pl-4 py-2">
                    <div className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">Đáp án mẫu</div>
                    <div className="flex items-start gap-2">
                      <p className="text-base leading-loose">
                        <JpText text={result.referenceAnswer} segments={furi[result.referenceAnswer]} />
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 rounded-full text-primary"
                        onClick={() => speakJa(result.referenceAnswer)}
                        aria-label="Đọc câu"
                      >
                        <Volume2 size={14} />
                      </Button>
                    </div>
                  </div>
                )}
                {submitted && (
                  <div className="border-l-4 border-muted-foreground/30 pl-4 py-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Câu của bạn</div>
                    <p className="text-base">{submitted}</p>
                  </div>
                )}
                {result.feedback && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.feedback}</p>
                )}
                <Button onClick={next} className="gap-1">
                  {isLast ? "Hoàn thành" : "Tiếp tục"} <ArrowRight size={16} />
                </Button>
              </Card>
            )}
          </>
        ) : (
          <Card data-anim="card" className="p-6 gap-4">
            <p className="text-sm text-muted-foreground">Chưa tạo được câu cho mục này.</p>
            <Button onClick={next}>Bỏ qua</Button>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
