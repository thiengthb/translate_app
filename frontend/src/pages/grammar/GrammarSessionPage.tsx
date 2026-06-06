import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";

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
} from "@/api/features/grammar/grammar-learn.api";
import { VERDICT_LABEL, VERDICT_STYLE } from "@/pages/production/production-constants";

type Phase = "loading" | "intro" | "practice" | "result";
type Mode = "cloze" | "free";

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

  // cloze
  const [cloze, setCloze] = useState<ClozeQuestion | null>(null);
  const [clozeResult, setClozeResult] = useState<ClozeResult | null>(null);
  const [attemptNo, setAttemptNo] = useState(1);
  const [showHint, setShowHint] = useState(false);

  // free-write
  const [exercise, setExercise] = useState<ExerciseResponse | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);

  const fetchSession = useCallback(async () => {
    setPhase("loading");
    try {
      const [s, g] = await Promise.all([
        grammarLearnApi.session(level, extra || challenge),
        grammarLearnApi.getGoal(),
      ]);
      setSession(s);
      setGoal(g);
      setPhase("intro");
    } catch {
      toast.error("Không tải được phiên học.");
      setPhase("intro");
    }
  }, [level, extra, challenge]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const resetItemState = () => {
    setAnswer("");
    setSubmitted("");
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
      // Challenge mode forces free-write; otherwise prefer a deterministic cloze
      // and fall back to free-write when no cloze can be built.
      const c = challenge ? null : await grammarLearnApi.cloze(item.subUseId);
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
  }, [challenge]);

  const start = () => {
    if (!session) return;
    setPhase("practice");
    setIndex(0);
    void loadItem(session.items[0]);
  };

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
        setAttemptNo((n) => n + 1); // forgiven, let them retry
      } else {
        setSubmitted(answer);
        bumpMastered(res.state, res.intervalDays);
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

  // ── Render ──
  if (phase === "loading") {
    return (
      <MainLayout pathName={{ "/grammar/learn": "Phiên học" }}>
        <div className="flex justify-center h-60 items-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (phase === "intro" && session) {
    const reviews = session.items.filter((i) => i.kind === "REVIEW");
    const news = session.items.filter((i) => i.kind === "NEW");
    return (
      <MainLayout pathName={{ "/grammar/learn": "Phiên học" }}>
        <div className="w-full max-w-xl flex flex-col gap-5">
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
            <Card className="p-4 flex-row flex-wrap items-center gap-4 text-sm">
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

          {session.items.length === 0 ? (
            <Card className="p-6 gap-4">
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
          ) : (
            <Card className="p-6 gap-4">
              {reviews.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">Ôn tập ({reviews.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {reviews.map((i) => (
                      <Badge key={i.subUseId} variant="secondary">{i.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {news.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">Bài mới ({news.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {news.map((i) => (
                      <Badge key={i.subUseId} className="bg-primary hover:bg-primary">{i.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">Tổng: {session.items.length} câu</div>
              <Button size="lg" onClick={start}>Bắt đầu</Button>
            </Card>
          )}
        </div>
      </MainLayout>
    );
  }

  if (phase === "result" && session) {
    return (
      <MainLayout pathName={{ "/grammar/learn": "Phiên học" }}>
        <div className="w-full max-w-xl flex flex-col gap-5">
          <Card className="p-8 gap-4 items-center text-center">
            <CheckCircle2 className="text-green-600" size={48} />
            <div className="text-lg font-bold">Hoàn thành</div>
            <div className="text-sm text-muted-foreground">
              {session.items.length} / {session.items.length} câu
            </div>
            <div className="flex gap-6 text-sm pt-2">
              <span>Mastered: <b className="text-foreground">+{masteredGain}</b></span>
              <span>Review: <b className="text-foreground">{session.reviewCount}</b></span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => navigate("/grammar")}>Về trang chủ</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Học tiếp</Button>
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
    <MainLayout pathName={{ "/grammar/learn": "Phiên học" }}>
      <div className="w-full max-w-xl flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Câu {index + 1} / {session?.items.length}</span>
          <div className="flex gap-2">
            {item && (
              <Badge variant={item.kind === "NEW" ? "default" : "secondary"}>
                {item.kind === "NEW" ? "Bài mới" : "Ôn tập"}
              </Badge>
            )}
            {!generating && (
              <Badge variant="outline">{mode === "cloze" ? "Điền chỗ trống" : "Tự viết câu"}</Badge>
            )}
          </div>
        </div>

        {generating ? (
          <Card className="p-6 h-40 flex-row items-center justify-center gap-3">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="text-sm text-muted-foreground">Đang tạo câu…</span>
          </Card>
        ) : mode === "cloze" && cloze ? (
          /* ── CLOZE ── */
          <>
            <Card className="p-6 gap-3">
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
              <p className="text-lg leading-relaxed tracking-wide">{cloze.masked}</p>
            </Card>

            <Card className="p-6 gap-4">
              <KanaInput
                value={answer}
                onChange={setAnswer}
                placeholder="Điền phần ngữ pháp (gõ romaji → hiragana)…"
                disabled={submitting || clozeDone}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !clozeDone && answer.trim()) submitCloze();
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
              <Card className="p-6 gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={clozeResult.status === "CORRECT" ? VERDICT_STYLE.PASS : VERDICT_STYLE.FAIL}>
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
                  <p className="text-sm text-muted-foreground mt-1">{clozeResult.fullSentence}</p>
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
            <Card className="p-6 gap-3">
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

            <Card className="p-6 gap-4">
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
              <Card className="p-6 gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={VERDICT_STYLE[result.finalVerdict]}>
                    {VERDICT_LABEL[result.finalVerdict] ?? result.finalVerdict}
                  </Badge>
                  <Badge variant={result.detectorPassed ? "secondary" : "outline"}>
                    {result.detectorPassed ? "✓ Dùng đúng mẫu" : "✗ Chưa dùng mẫu"}
                  </Badge>
                  <span className="ml-auto text-sm">Lần ôn tới: <b>{result.goodPreview}</b></span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span>Grammar: <b className="text-foreground">{result.detectorPassed ? "✓" : "✗"}</b></span>
                  {result.judgeScore != null && (
                    <span>Writing: <b className="text-foreground">{Math.round(result.judgeScore * 100)}</b></span>
                  )}
                  <span className="text-muted-foreground">→ {result.ratingApplied}</span>
                </div>
                {result.referenceAnswer && (
                  <div className="border-l-4 border-green-600 bg-green-600/5 pl-4 py-2">
                    <div className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">Đáp án mẫu</div>
                    <p className="text-base">{result.referenceAnswer}</p>
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
          <Card className="p-6 gap-4">
            <p className="text-sm text-muted-foreground">Chưa tạo được câu cho mục này.</p>
            <Button onClick={next}>Bỏ qua</Button>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
