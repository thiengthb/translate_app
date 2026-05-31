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
import { Check, ChevronLeft, ChevronRight, Clock, Loader2, Send, Star, X } from "lucide-react";
import { acceptedAnswers, formatSeconds, isCorrectOption } from "./_shared";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";

type OptionSnap = { id: number; content: string; contentImageUrl?: string | null; contentAudioUrl?: string | null };

// How many questions to show per page; user picks one in the right sidebar.
const PAGE_SIZES = [10, 50, 100];

export default function QuizSessionPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const session = useQuizSession(Number(quizId), Number(attemptId));
  const { attempt, quiz, loading, timeRemaining, submitting } = session;

  const [confirmOpen, setConfirmOpen] = useState(false);
  // local drafts keyed by attemptQuestionId
  const [drafts, setDrafts] = useState<Record<number, { optionId?: number; optionIds?: number[]; text?: string }>>({});
  const startedAtRef = useState(() => Date.now())[0];

  // Pagination: how many questions per page (10/50/100) and the current page.
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(0);

  // Questions the user has starred / marked for review (client-side only,
  // keyed by attempt-question id).
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const toggleFlag = (qid: number) =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid); else next.add(qid);
      return next;
    });

  // If already submitted, jump straight to results.
  useEffect(() => {
    if (attempt?.status === "SUBMITTED") {
      navigate(`/quizzes/${quizId}/result/${attemptId}`, { replace: true });
    }
  }, [attempt?.status, quizId, attemptId, navigate]);

  // Changing the page size restarts from the first page.
  useEffect(() => { setPage(0); }, [pageSize]);

  const questions = attempt?.attemptQuestions ?? [];

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

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">This attempt has no questions.</p>
        <Button variant="outline" onClick={() => navigate(`/quizzes/${quizId}`)}>Back to quiz</Button>
      </div>
    );
  }

  /* ── Pagination math ── */
  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, questions.length);
  const pageQuestions = questions.slice(pageStart, pageEnd);
  const isLastPage = safePage >= totalPages - 1;

  // Jump to a question: switch to its page, then scroll it into view (works
  // with ScrollHintContainer, which owns its own scroll viewport).
  const scrollToQuestion = (i: number) =>
    window.setTimeout(() => {
      document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  const prevPage = () => { const p = Math.max(0, safePage - 1); setPage(p); scrollToQuestion(p * pageSize); };
  const nextPage = () => { const p = Math.min(totalPages - 1, safePage + 1); setPage(p); scrollToQuestion(p * pageSize); };
  const goToQuestion = (i: number) => { setPage(Math.floor(i / pageSize)); scrollToQuestion(i); };

  /* ── One question block (rendered for every question on the page) ── */
  const renderQuestion = (qq: QuizAttemptQuestionDTO, gi: number) => {
    const draft = drafts[qq.id] ?? {};
    const snap = qq.questionSnapshot as Record<string, unknown>;
    const options = (qq.optionsSnapshot ?? []) as OptionSnap[];
    // No per-question feedback during the quiz — correctness is only shown
    // on the result page after the whole quiz is submitted.
    const revealed = false;

    return (
      <div key={qq.id} id={`q-${gi}`} className="scroll-mt-4 space-y-4 border-b border-border/60 pb-8 last:border-0 last:pb-0">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-semibold leading-snug">
              <span className="text-muted-foreground mr-2 tabular-nums">{gi + 1}.</span>
              {String(snap.prompt ?? "")}
            </p>
            <Button variant="ghost" size="sm" onClick={() => toggleFlag(qq.id)}
              title="Mark this question to revisit"
              className={cn("shrink-0", flagged.has(qq.id) ? "text-amber-500" : "text-muted-foreground")}>
              <Star className={cn("size-4 mr-1", flagged.has(qq.id) && "fill-amber-400")} />
              {flagged.has(qq.id) ? "Marked" : "Mark"}
            </Button>
          </div>
          {typeof snap.promptImageUrl === "string" && snap.promptImageUrl && (
            <img src={snap.promptImageUrl} alt="" className="max-h-56 rounded-lg border border-border" />
          )}
          {typeof snap.promptAudioUrl === "string" && snap.promptAudioUrl && (
            <audio src={snap.promptAudioUrl} controls className="w-full max-w-sm" />
          )}
        </div>

        {/* Answer area by type */}
        {qq.questionType === "SINGLE_CHOICE" || qq.questionType === "TRUE_FALSE" ? (
          <RadioGroup
            value={draft.optionId != null ? String(draft.optionId) : ""}
            onValueChange={(v) => { const optionId = Number(v); setDraft(qq.id, { optionId }); void saveAnswer(qq, { optionId }); }}
            className="space-y-2"
          >
            {options.map((o) => {
              const correct = isCorrectOption(qq.correctAnswerSnapshot, o.id);
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
        ) : qq.questionType === "MULTIPLE_CHOICE" ? (
          <div className="space-y-2">
            {options.map((o) => {
              const checked = (draft.optionIds ?? []).includes(o.id);
              const correct = isCorrectOption(qq.correctAnswerSnapshot, o.id);
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
                      setDraft(qq.id, { optionIds });
                      void saveAnswer(qq, { optionIds });
                    }}
                  />
                  <span className="text-sm">{o.content}</span>
                </label>
              );
            })}
          </div>
        ) : qq.questionType === "FILL_BLANK" ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={draft.text ?? ""}
                disabled={revealed}
                onChange={(e) => setDraft(qq.id, { text: e.target.value })}
                placeholder="Type your answer…"
              />
              <Button variant="outline" disabled={revealed || !(draft.text ?? "").trim()} onClick={() => saveAnswer(qq, { text: draft.text })}>Check</Button>
            </div>
            {revealed && acceptedAnswers(qq.correctAnswerSnapshot).length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Accepted: {acceptedAnswers(qq.correctAnswerSnapshot).join(" / ")}
              </p>
            )}
          </div>
        ) : (
          /* Hidden for now: WRITING / MATCHING / ORDERING / LISTENING. */
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
            This question type ({qq.questionType}) is not yet supported.
          </div>
        )}

        {/* Reveal explanation */}
        {revealed && qq.isCorrect != null && (
          <div className={cn("rounded-lg p-3 text-sm flex items-start gap-2",
            qq.isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400")}>
            {qq.isCorrect ? <Check className="size-4 mt-0.5" /> : <X className="size-4 mt-0.5" />}
            <div>
              <p className="font-medium">{qq.isCorrect ? "Correct" : "Incorrect"}</p>
              {qq.questionType === "FILL_BLANK" && acceptedAnswers(qq.correctAnswerSnapshot).length > 0 && (
                <p className="opacity-90 mt-0.5">Accepted: {acceptedAnswers(qq.correctAnswerSnapshot).join(", ")}</p>
              )}
              {typeof snap.explanation === "string" && snap.explanation && <p className="opacity-90 mt-0.5">{snap.explanation}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{quiz?.title}</p>
          <p className="text-xs text-muted-foreground">
            Page {safePage + 1} / {totalPages} · {answeredCount}/{questions.length} answered
          </p>
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

      {/* Body + right-hand navigator */}
      <div className="flex-1 min-h-0 flex">
        {/* Main: the current page of questions (scrolls, scrollbar hidden) */}
        <ScrollHintContainer className="flex-1">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
            {pageQuestions.map((qq, li) => renderQuestion(qq, pageStart + li))}

            {/* Page navigation */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" onClick={prevPage} disabled={safePage === 0}>
                <ChevronLeft className="size-4 mr-1" />Prev
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">Page {safePage + 1} / {totalPages}</span>
              {isLastPage ? (
                <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                  <Send className="size-4 mr-1" />Submit
                </Button>
              ) : (
                <Button variant="outline" onClick={nextPage}>
                  Next<ChevronRight className="size-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </ScrollHintContainer>

        {/* Right: question navigator */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-border">
          <div className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Questions</p>
              <span className="text-xs text-muted-foreground tabular-nums">{answeredCount}/{questions.length}</span>
            </div>
            {/* Questions per page */}
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {PAGE_SIZES.map((s) => (
                <button key={s} type="button" onClick={() => setPageSize(s)}
                  className={cn("flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    pageSize === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {pageSize} / page · showing {pageStart + 1}–{pageEnd} of {questions.length}
              {flagged.size > 0 && (
                <span className="inline-flex items-center gap-0.5 ml-1">
                  · <Star className="size-3 fill-amber-400 text-amber-500" />{flagged.size} marked
                </span>
              )}
            </p>
          </div>

          <ScrollHintContainer className="flex-1" viewportClassName="px-4 py-3">
            <div className="space-y-3">
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((qq, i) => (
                <button key={qq.id} onClick={() => goToQuestion(i)}
                  className={cn("relative size-9 rounded-md text-xs font-medium transition-colors",
                    i >= pageStart && i < pageEnd && "ring-2 ring-primary",
                    qq.isAnswered ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground hover:bg-accent")}>
                  {i + 1}
                  {flagged.has(qq.id) && (
                    <Star className="absolute -top-1 -right-1 size-3 fill-amber-400 text-amber-500" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-green-500/20" />Answered</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-muted" />Unanswered</span>
              <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-500" />Marked</span>
            </div>
            </div>
          </ScrollHintContainer>

          {/* Page Prev / Next */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={prevPage} disabled={safePage === 0}>
              <ChevronLeft className="size-4 mr-1" />Prev
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={nextPage} disabled={isLastPage}>
              Next<ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile page nav (sidebar is hidden on small screens) */}
      <footer className="md:hidden border-t border-border px-5 py-3 shrink-0 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={prevPage} disabled={safePage === 0}>
          <ChevronLeft className="size-4 mr-1" />Prev
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">Page {safePage + 1} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={nextPage} disabled={isLastPage}>
          Next<ChevronRight className="size-4 ml-1" />
        </Button>
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
