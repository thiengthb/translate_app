import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuizSession } from "@/hooks/useQuizSession";
import type { QuizAttemptQuestionDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Clock, Loader2, Send, X } from "lucide-react";
import { acceptedAnswers, formatSeconds, isCorrectOption } from "./_shared";

type OptionSnap = { id: number; content: string; contentImageUrl?: string | null; contentAudioUrl?: string | null };

export default function QuizSessionPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const session = useQuizSession(Number(quizId), Number(attemptId));
  const { attempt, quiz, loading, currentIndex, currentQuestion, timeRemaining, submitting } = session;

  const [confirmOpen, setConfirmOpen] = useState(false);
  // local drafts keyed by attemptQuestionId
  const [drafts, setDrafts] = useState<Record<number, { optionId?: number; optionIds?: number[]; text?: string }>>({});
  const startedAtRef = useState(() => Date.now())[0];

  // If already submitted, jump straight to results.
  useEffect(() => {
    if (attempt?.status === "SUBMITTED") {
      navigate(`/quizzes/${quizId}/result/${attemptId}`, { replace: true });
    }
  }, [attempt?.status, quizId, attemptId, navigate]);

  const questions = attempt?.attemptQuestions ?? [];
  const showAnswer = quiz?.showAnswerAfterSubmit ?? false;

  const saveAnswer = async (q: QuizAttemptQuestionDTO, draft: { optionId?: number; optionIds?: number[]; text?: string }) => {
    await session.submitAnswer({
      attemptQuestionId: q.id,
      selectedOptionId: draft.optionId,
      selectedOptionIds: draft.optionIds,
      answerText: draft.text,
      responseTimeMs: Date.now() - startedAtRef,
    });
  };

  const setDraft = (qid: number, patch: Partial<{ optionId: number; optionIds: number[]; text: string }>) =>
    setDrafts((d) => ({ ...d, [qid]: { ...d[qid], ...patch } }));

  const handleFinish = async () => {
    setConfirmOpen(false);
    const result = await session.finish();
    if (result) navigate(`/quizzes/${quizId}/result/${attemptId}`, { replace: true });
  };

  const answeredCount = useMemo(() => questions.filter((q) => q.isAnswered).length, [questions]);

  if (loading || !attempt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">This attempt has no questions.</p>
        <Button variant="outline" onClick={() => navigate(`/quizzes/${quizId}`)}>Back to quiz</Button>
      </div>
    );
  }

  const q = currentQuestion;
  const draft = drafts[q.id] ?? {};
  const snap = q.questionSnapshot as Record<string, unknown>;
  const options = (q.optionsSnapshot ?? []) as OptionSnap[];
  const revealed = q.isAnswered && showAnswer;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{quiz?.title}</p>
          <p className="text-xs text-muted-foreground">Question {currentIndex + 1} / {questions.length} · {answeredCount} answered</p>
        </div>
        <div className="flex items-center gap-3">
          {timeRemaining != null && (
            <span className={cn("flex items-center gap-1.5 text-sm font-mono tabular-nums px-2.5 py-1 rounded-md",
              timeRemaining < 60 ? "bg-red-500/15 text-red-600" : "bg-muted text-foreground")}>
              <Clock className="size-4" />{formatSeconds(timeRemaining)}
            </span>
          )}
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
            <Send className="size-4 mr-1" /> Submit quiz
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
          <div className="space-y-3">
            <p className="text-lg font-semibold leading-snug">{String(snap.prompt ?? "")}</p>
            {typeof snap.promptImageUrl === "string" && snap.promptImageUrl && (
              <img src={snap.promptImageUrl} alt="" className="max-h-56 rounded-lg border border-border" />
            )}
            {typeof snap.promptAudioUrl === "string" && snap.promptAudioUrl && (
              <audio src={snap.promptAudioUrl} controls className="w-full max-w-sm" />
            )}
          </div>

          {/* Answer area by type */}
          {q.questionType === "SINGLE_CHOICE" || q.questionType === "TRUE_FALSE" ? (
            <RadioGroup
              value={draft.optionId != null ? String(draft.optionId) : ""}
              onValueChange={(v) => { const optionId = Number(v); setDraft(q.id, { optionId }); void saveAnswer(q, { optionId }); }}
              className="space-y-2"
            >
              {options.map((o) => {
                const correct = isCorrectOption(q.correctAnswerSnapshot, o.id);
                return (
                  <label key={o.id}
                    className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      revealed && correct && "border-green-500 bg-green-500/10",
                      revealed && !correct && draft.optionId === o.id && "border-red-500 bg-red-500/10",
                      !revealed && "hover:bg-accent")}>
                    <RadioGroupItem value={String(o.id)} disabled={revealed} />
                    <span className="text-sm">{o.content}</span>
                  </label>
                );
              })}
            </RadioGroup>
          ) : q.questionType === "MULTIPLE_CHOICE" ? (
            <div className="space-y-2">
              {options.map((o) => {
                const checked = (draft.optionIds ?? []).includes(o.id);
                const correct = isCorrectOption(q.correctAnswerSnapshot, o.id);
                return (
                  <label key={o.id}
                    className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      revealed && correct && "border-green-500 bg-green-500/10",
                      revealed && !correct && checked && "border-red-500 bg-red-500/10",
                      !revealed && "hover:bg-accent")}>
                    <Checkbox
                      checked={checked}
                      disabled={revealed}
                      onCheckedChange={(c) => {
                        const set = new Set(draft.optionIds ?? []);
                        if (c) set.add(o.id); else set.delete(o.id);
                        const optionIds = Array.from(set);
                        setDraft(q.id, { optionIds });
                        void saveAnswer(q, { optionIds });
                      }}
                    />
                    <span className="text-sm">{o.content}</span>
                  </label>
                );
              })}
            </div>
          ) : q.questionType === "FILL_BLANK" ? (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  value={draft.text ?? ""}
                  disabled={revealed}
                  onChange={(e) => setDraft(q.id, { text: e.target.value })}
                  placeholder="Type your answer…"
                />
                <Button variant="outline" disabled={revealed || !(draft.text ?? "").trim()} onClick={() => saveAnswer(q, { text: draft.text })}>Check</Button>
              </div>
              {revealed && acceptedAnswers(q.correctAnswerSnapshot).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted: {acceptedAnswers(q.correctAnswerSnapshot).join(" / ")}
                </p>
              )}
            </div>
          ) : (
            /* Question type not yet supported in this interface (WRITING /
               MATCHING / ORDERING / LISTENING are hidden for now). */
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
              This question type ({q.questionType}) is not yet supported.
            </div>
          )}
          {/*
            ── Hidden question-type renderers (kept for easy re-enabling) ──
            Re-add `import { Textarea } from "@/components/ui/textarea";` when restoring WRITING.

            WRITING — free response:
            <div className="space-y-2">
              <Textarea
                value={draft.text ?? ""}
                onChange={(e) => setDraft(q.id, { text: e.target.value })}
                onBlur={() => (draft.text ?? "").trim() && saveAnswer(q, { text: draft.text })}
                rows={6}
                placeholder="Write your answer… (graded later)"
              />
              <p className="text-xs text-muted-foreground">Free-response — will be reviewed after submission.</p>
            </div>

            ORDERING / MATCHING — click options in the correct order:
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Tap options in the correct order.</p>
              {options.map((o) => {
                const order = (draft.optionIds ?? []).indexOf(o.id);
                return (
                  <button key={o.id} type="button" disabled={revealed}
                    onClick={() => {
                      const arr = [...(draft.optionIds ?? [])];
                      const idx = arr.indexOf(o.id);
                      if (idx >= 0) arr.splice(idx, 1); else arr.push(o.id);
                      setDraft(q.id, { optionIds: arr });
                      void saveAnswer(q, { optionIds: arr });
                    }}
                    className={cn("w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                      order >= 0 ? "border-primary bg-primary/5" : "hover:bg-accent")}>
                    <span className="size-6 rounded-full border flex items-center justify-center text-xs">{order >= 0 ? order + 1 : ""}</span>
                    {o.content}
                  </button>
                );
              })}
            </div>
          */}

          {/* Reveal explanation */}
          {revealed && q.isCorrect != null && (
            <div className={cn("rounded-lg p-3 text-sm flex items-start gap-2",
              q.isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400")}>
              {q.isCorrect ? <Check className="size-4 mt-0.5" /> : <X className="size-4 mt-0.5" />}
              <div>
                <p className="font-medium">{q.isCorrect ? "Correct" : "Incorrect"}</p>
                {q.questionType === "FILL_BLANK" && acceptedAnswers(q.correctAnswerSnapshot).length > 0 && (
                  <p className="opacity-90 mt-0.5">
                    Accepted: {acceptedAnswers(q.correctAnswerSnapshot).join(", ")}
                  </p>
                )}
                {typeof snap.explanation === "string" && snap.explanation && <p className="opacity-90 mt-0.5">{snap.explanation}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="border-t border-border px-5 py-3 shrink-0 space-y-3">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {questions.map((qq, i) => (
            <button key={qq.id} onClick={() => session.goToQuestion(i)}
              className={cn("size-7 rounded-md text-xs font-medium transition-colors",
                i === currentIndex && "ring-2 ring-primary",
                qq.isAnswered && (qq.isCorrect === false ? "bg-red-500/20 text-red-600" : "bg-green-500/20 text-green-600"),
                !qq.isAnswered && "bg-muted text-muted-foreground")}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={session.prev} disabled={currentIndex === 0}><ChevronLeft className="size-4 mr-1" />Prev</Button>
          <Button variant="outline" onClick={session.next} disabled={currentIndex >= questions.length - 1}>Next<ChevronRight className="size-4 ml-1" /></Button>
        </div>
      </footer>

      {/* Confirm submit */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit quiz?</DialogTitle>
            <DialogDescription>
              You answered {answeredCount} of {questions.length} questions. You can't change answers after submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Keep going</Button>
            <Button onClick={handleFinish} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Send className="size-4 mr-1" />}Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
