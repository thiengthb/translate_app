import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi, classroomApi } from "@/api";
import type { ClassAssignmentDTO, ClassroomDTO, QuizAttemptDTO, QuizDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ClipboardList } from "lucide-react";
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
  // When the attempt belongs to a class assignment, these are loaded so the
  // page reads as an assignment result (group-context breadcrumb + back) rather
  // than a free-play quiz attempt.
  const [assignment, setAssignment] = useState<ClassAssignmentDTO | null>(null);
  const [group, setGroup] = useState<ClassroomDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([assessmentApi.getAttempt(Number(attemptId)), assessmentApi.fetchQuizById(id)])
      .then(async ([a, q]) => {
        if (cancelled) return;
        setAttempt(a); setQuiz(q);
        if (a.assignmentId != null) {
          try {
            const asg = await classroomApi.getAssignmentById(a.assignmentId);
            if (cancelled) return;
            setAssignment(asg);
            const grp = await classroomApi.getClassroomById(asg.classroomId);
            if (!cancelled) setGroup(grp);
          } catch { /* fall back to plain quiz context */ }
        }
      })
      .catch(() => toast.error("Failed to load result."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attemptId, id]);

  const retake = async () => {
    setRetaking(true);
    try {
      // Preserve the assignment link on retake so the new attempt still counts
      // toward the assignment (and respects its attempt limit).
      const a = await assessmentApi.startAttempt(
        attempt?.assignmentId != null ? { quizId: id, assignmentId: attempt.assignmentId } : { quizId: id }
      );
      navigate(`/quizzes/${id}/attempt/${a.id}`);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? "You've reached the attempt limit." : "Could not start a new attempt.");
      setRetaking(false);
    }
  };

  if (loading) {
    return (
      <MainLayout pathName={{ "/quizzes": "Quizzes" }}>
        <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">Loading…</div>
      </MainLayout>
    );
  }
  if (!attempt) return null;

  const passed = attempt.isPassed;

  /* ── Context: assignment attempt vs free-play quiz attempt ── */
  const isAssignment = attempt.assignmentId != null && assignment != null;
  const cid = assignment?.classroomId;
  const backHref = isAssignment ? `/classrooms/${cid}` : `/quizzes/${id}`;

  // Assignment attempts get a group-context breadcrumb (Home › <group> ›
  // <assignment>) by hiding the /quizzes URL segments; free-play attempts keep
  // the regular Quizzes breadcrumb.
  const layoutProps = isAssignment
    ? {
        pathName: { [`/quizzes/${id}/result/${attemptId}`]: assignment!.title },
        parentCrumb: { href: `/classrooms/${cid}`, title: group?.name ?? "Group" },
        ignorePaths: ["quizzes", String(id), "result"],
        breadcrumbIcon: <ClipboardList className="size-4.5 text-primary" />,
      }
    : { pathName: { "/quizzes": "Quizzes", [`/quizzes/${id}`]: quiz?.title ?? "Quiz" } };

  return (
    <MainLayout {...layoutProps}>
      <div className="space-y-6 w-full max-w-3xl mx-auto">
        {/* Nav bar (mirrors the quiz session header) */}
        <header className="flex items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button variant="ghost" size="sm" className="shrink-0 gap-1" onClick={() => navigate(backHref)}>
              <ChevronLeft className="size-4" />{isAssignment ? "Group" : "Back"}
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-semibold truncate">{isAssignment ? assignment!.title : (quiz?.title ?? "Quiz")}</p>
                {isAssignment && (
                  <Badge variant="outline" className="shrink-0 gap-1 border-primary/30 bg-primary/5 text-primary text-[10px]">
                    <ClipboardList className="size-3" />Assignment
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {isAssignment ? (
                  <>{group?.name ? `${group.name} · ` : ""}{quiz?.title ?? "Quiz"}</>
                ) : (
                  <span className={cn("font-medium", passed ? "text-green-600" : "text-red-600")}>
                    {passed ? "Passed" : "Not passed"} · {attempt.percentage.toFixed(0)}%
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowReview((s) => !s)}>
              {showReview ? "Hide" : "Review"} answers
            </Button>
            {(quiz?.allowRetake ?? true) && (
              <Button size="sm" onClick={retake} disabled={retaking}>
                {retaking ? "Starting…" : "Retake"}
              </Button>
            )}
          </div>
        </header>

        {/* Result banner */}
        <Card className={cn("p-6 text-center space-y-3", passed ? "bg-green-500/5" : "bg-red-500/5")}>
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
                      <span className="text-xs font-medium text-green-600 shrink-0">Correct</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600 shrink-0">Wrong</span>
                    )}
                  </div>

                  {/* Options */}
                  {options.length > 0 && (
                    <div className="px-4 py-3 space-y-2">
                      {options.map((o, oi) => {
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
                              "shrink-0 w-5 text-center text-sm font-bold",
                              variant === "selected-correct" && "text-green-600",
                              variant === "correct"          && "text-green-600",
                              variant === "selected-wrong"   && "text-red-600",
                              variant === "neutral"          && "text-muted-foreground",
                            )}>
                              {String.fromCharCode(65 + oi)}
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
                          <span className="flex-1">{userText}</span>
                          <span className="text-[10px] font-semibold text-muted-foreground shrink-0">Your answer</span>
                        </div>
                      )}
                      {acceptedAnswers(q.correctAnswerSnapshot).length > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-500/5 px-3 py-2 text-sm dark:border-green-800">
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
                        {snap.explanation}
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
