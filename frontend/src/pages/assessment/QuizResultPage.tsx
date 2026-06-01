import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { QuizAttemptDTO, QuizDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  acceptedAnswers, formatSeconds, getUserAnswerText,
  getUserSelectedOptionId, getUserSelectedOptionIds, isCorrectOption,
} from "./_shared";

type OptionSnap = { id: number; content: string };

export default function QuizResultPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const id = Number(quizId);
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<QuizAttemptDTO | null>(null);
  const [quiz, setQuiz] = useState<QuizDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    Promise.all([assessmentApi.getAttempt(Number(attemptId)), assessmentApi.fetchQuizById(id)])
      .then(([a, q]) => { setAttempt(a); setQuiz(q); })
      .catch(() => toast.error("Failed to load result."))
      .finally(() => setLoading(false));
  }, [attemptId, id]);

  const retake = async () => {
    setRetaking(true);
    try {
      const a = await assessmentApi.startAttempt({ quizId: id });
      navigate(`/quizzes/${id}/attempt/${a.id}`);
    } catch {
      toast.error("Could not start a new attempt.");
      setRetaking(false);
    }
  };

  if (loading) {
    return (
      <MainLayout pathName={{ "/quizzes": "Quizzes" }}>
        <div className="flex items-center justify-center h-60"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </MainLayout>
    );
  }
  if (!attempt) return null;

  const passed = attempt.isPassed;

  return (
    <MainLayout pathName={{ "/quizzes": "Quizzes", [`/quizzes/${id}`]: quiz?.title ?? "Quiz" }}>
      <div className="space-y-6 w-full max-w-3xl mx-auto">
        {/* Nav bar (mirrors the quiz session header) */}
        <header className="flex items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => navigate(`/quizzes/${id}`)} aria-label="Back to quiz">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{quiz?.title ?? "Quiz"}</p>
              <p className={cn("text-xs font-medium", passed ? "text-green-600" : "text-red-600")}>
                {passed ? "Passed" : "Not passed"} · {attempt.percentage.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowReview((s) => !s)}>
              {showReview ? "Hide" : "Review"} answers
            </Button>
            {(quiz?.allowRetake ?? true) && (
              <Button size="sm" onClick={retake} disabled={retaking}>
                {retaking ? <Loader2 className="size-4 animate-spin mr-1" /> : <RotateCcw className="size-4 mr-1" />}Retake
              </Button>
            )}
          </div>
        </header>

        {/* Result banner */}
        <Card className={cn("p-6 text-center space-y-3", passed ? "bg-green-500/5" : "bg-red-500/5")}>
          <div className={cn("mx-auto size-16 rounded-full flex items-center justify-center", passed ? "bg-green-500/15" : "bg-red-500/15")}>
            {passed ? <Check className="size-8 text-green-600" /> : <X className="size-8 text-red-600" />}
          </div>
          <h1 className={cn("text-2xl font-bold", passed ? "text-green-600" : "text-red-600")}>{passed ? "Passed!" : "Not passed"}</h1>
          <p className="text-3xl font-bold tabular-nums">{attempt.percentage.toFixed(0)}%</p>
          <p className="text-sm text-muted-foreground">{attempt.earnedScore} / {attempt.totalScore} points</p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Correct" value={attempt.correctQuestions} tone="text-green-600" />
          <Stat label="Wrong" value={attempt.wrongQuestions} tone="text-red-600" />
          <Stat label="Skipped" value={attempt.skippedQuestions} tone="text-muted-foreground" />
          <Stat label="Time" value={formatSeconds(attempt.timeSpentSeconds)} />
        </div>

        {/* Review */}
        {showReview && (
          <div className="space-y-4">
            {attempt.attemptQuestions.map((q, i) => {
              const snap = q.questionSnapshot as Record<string, unknown>;
              const options = (q.optionsSnapshot ?? []) as OptionSnap[];
              const userSnap = q.userAnswerSnapshot;
              const userSelId = getUserSelectedOptionId(userSnap);
              const userSelIds = getUserSelectedOptionIds(userSnap);
              const userText = getUserAnswerText(userSnap);
              const isMulti = q.questionType === "MULTIPLE_CHOICE";

              const userPicked = (id: number) =>
                isMulti ? userSelIds.includes(id) : userSelId === id;

              return (
                <Card key={q.id} className="overflow-hidden p-0">
                  {/* Question header */}
                  <div className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-border/60",
                    q.isCorrect == null ? "bg-amber-500/5" : q.isCorrect ? "bg-green-500/5" : "bg-red-500/5"
                  )}>
                    <span className={cn(
                      "shrink-0 mt-0.5 size-6 rounded-full flex items-center justify-center text-xs font-bold",
                      q.isCorrect == null ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : q.isCorrect ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {i + 1}
                    </span>
                    <p className="flex-1 text-sm font-semibold leading-snug">{String(snap.prompt ?? "")}</p>
                    {q.isCorrect == null ? (
                      <span className="text-xs font-medium text-amber-600 shrink-0">Pending</span>
                    ) : q.isCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 shrink-0"><Check className="size-3.5" />Correct</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 shrink-0"><X className="size-3.5" />Wrong</span>
                    )}
                  </div>

                  {/* Options */}
                  {options.length > 0 && (
                    <div className="px-4 py-3 space-y-2">
                      {options.map((o) => {
                        const correct = isCorrectOption(q.correctAnswerSnapshot, o.id);
                        const picked = userPicked(o.id);
                        const variant =
                          correct && picked ? "selected-correct"
                          : correct && !picked ? "correct"
                          : !correct && picked ? "selected-wrong"
                          : "neutral";
                        return (
                          <div key={o.id} className={cn(
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                            variant === "selected-correct" && "border-green-500 bg-green-500/10",
                            variant === "correct"          && "border-green-300 bg-green-500/5 dark:border-green-800",
                            variant === "selected-wrong"   && "border-red-400 bg-red-500/10",
                            variant === "neutral"          && "border-border bg-muted/30 text-muted-foreground",
                          )}>
                            <span className={cn(
                              "shrink-0 size-5 rounded-full border-2 flex items-center justify-center",
                              variant === "selected-correct" && "border-green-500 bg-green-500 text-white",
                              variant === "correct"          && "border-green-400",
                              variant === "selected-wrong"   && "border-red-400 bg-red-400 text-white",
                              variant === "neutral"          && "border-muted-foreground/30",
                            )}>
                              {(variant === "selected-correct" || variant === "correct") && <Check className="size-3" />}
                              {variant === "selected-wrong" && <X className="size-3" />}
                            </span>
                            <span className="flex-1 leading-snug">{o.content}</span>
                            {picked && variant === "selected-correct" && (
                              <span className="text-[10px] font-semibold text-green-600 shrink-0">Your answer</span>
                            )}
                            {picked && variant === "selected-wrong" && (
                              <span className="text-[10px] font-semibold text-red-600 shrink-0">Your answer</span>
                            )}
                            {!picked && variant === "correct" && (
                              <span className="text-[10px] font-medium text-green-600 shrink-0">Correct answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* FILL_BLANK */}
                  {q.questionType === "FILL_BLANK" && (
                    <div className="px-4 pb-3 space-y-2">
                      {userText && (
                        <div className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                          q.isCorrect ? "border-green-400 bg-green-500/10" : "border-red-400 bg-red-500/10"
                        )}>
                          {q.isCorrect ? <Check className="size-4 text-green-600 shrink-0" /> : <X className="size-4 text-red-600 shrink-0" />}
                          <span className="flex-1">{userText}</span>
                          <span className="text-[10px] font-semibold text-muted-foreground shrink-0">Your answer</span>
                        </div>
                      )}
                      {acceptedAnswers(q.correctAnswerSnapshot).length > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-500/5 px-3 py-2 text-sm dark:border-green-800">
                          <Check className="size-4 text-green-600 shrink-0" />
                          <span className="flex-1 text-green-700 dark:text-green-400">
                            {acceptedAnswers(q.correctAnswerSnapshot).join(" · ")}
                          </span>
                          <span className="text-[10px] font-medium text-green-600 shrink-0">Correct answer</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {typeof snap.explanation === "string" && snap.explanation && (
                    <div className="px-4 pb-3 pt-0">
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                        💡 {snap.explanation}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-3 text-center">
      <p className={cn("text-xl font-bold tabular-nums", tone)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
