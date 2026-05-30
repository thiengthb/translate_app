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
import { formatSeconds } from "./_shared";

type OptionSnap = { id: number; content: string; isCorrect?: boolean };

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
      <div className="space-y-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/quizzes/${id}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back to quiz
        </button>

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

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" onClick={() => setShowReview((s) => !s)}>{showReview ? "Hide" : "Review"} answers</Button>
          {(quiz?.allowRetake ?? true) && (
            <Button onClick={retake} disabled={retaking}>
              {retaking ? <Loader2 className="size-4 animate-spin mr-1" /> : <RotateCcw className="size-4 mr-1" />}Retake
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(`/quizzes/${id}`)}>Back to quiz</Button>
        </div>

        {/* Review */}
        {showReview && (
          <div className="space-y-3">
            {attempt.attemptQuestions.map((q, i) => {
              const snap = q.questionSnapshot as Record<string, unknown>;
              const options = (q.optionsSnapshot ?? []) as OptionSnap[];
              return (
                <Card key={q.id} className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <p className="flex-1 text-sm font-medium">{String(snap.prompt ?? "")}</p>
                    {q.isCorrect == null ? (
                      <span className="text-xs text-amber-600">Pending</span>
                    ) : q.isCorrect ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <X className="size-4 text-red-600" />
                    )}
                  </div>
                  {options.length > 0 && (
                    <div className="space-y-1 pl-6">
                      {options.map((o) => (
                        <div key={o.id} className={cn("text-sm rounded px-2 py-1",
                          o.isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "text-muted-foreground")}>
                          {o.isCorrect && <Check className="size-3.5 inline mr-1" />}{o.content}
                        </div>
                      ))}
                    </div>
                  )}
                  {typeof snap.explanation === "string" && snap.explanation && (
                    <p className="text-xs text-muted-foreground pl-6">💡 {snap.explanation}</p>
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
