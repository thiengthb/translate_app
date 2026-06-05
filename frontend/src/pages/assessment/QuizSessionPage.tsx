import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuizSession } from "@/hooks/useQuizSession";
import type { QuizAttemptQuestionDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Clock, Loader2, Send, Star } from "lucide-react";
import { formatSeconds } from "./_shared";
import { QUESTION_TYPE_LABELS } from "./QuestionOptionsPreview";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";

type OptionSnap = { id: number; content: string; contentImageUrl?: string | null; contentAudioUrl?: string | null };

// How many questions to show per page; user picks one in the right sidebar.
const PAGE_SIZES = [10, 50, 100];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
  const progressPct = questions.length ? (answeredCount / questions.length) * 100 : 0;

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
    const isMulti = qq.questionType === "MULTIPLE_CHOICE";
    const isSingle = qq.questionType === "SINGLE_CHOICE" || qq.questionType === "TRUE_FALSE";
    const marked = flagged.has(qq.id);

    return (
      <div
        key={qq.id}
        id={`q-${gi}`}
        className={cn(
          "scroll-mt-4 space-y-3 rounded-2xl border border-border/60 bg-card p-3.5 sm:p-4 shadow-sm transition-colors",
          marked && "border-amber-400/60",
        )}
      >
        {/* Meta + prompt */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-primary tabular-nums">Question {gi + 1}</span>
              <span className="text-xs text-muted-foreground tabular-nums">of {questions.length}</span>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {QUESTION_TYPE_LABELS[qq.questionType] ?? qq.questionType}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => toggleFlag(qq.id)}
              title={marked ? "Unmark" : "Mark to revisit"}
              aria-pressed={marked}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors",
                marked
                  ? "border-amber-400/60 bg-amber-500/12 text-amber-700"
                  : "border-amber-300/70 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/35",
              )}
            >
              <Star className={cn("size-4 text-amber-500", marked && "fill-amber-400")} />
              {marked ? "Marked" : "Mark"}
            </button>
          </div>
          <p className="text-lg font-semibold leading-snug">{String(snap.prompt ?? "")}</p>
          {typeof snap.promptImageUrl === "string" && snap.promptImageUrl && (
            <img src={snap.promptImageUrl} alt="" className="max-h-60 rounded-lg border border-border" />
          )}
          {typeof snap.promptAudioUrl === "string" && snap.promptAudioUrl && (
            <audio src={snap.promptAudioUrl} controls className="w-full max-w-sm" />
          )}
        </div>

        {/* Answer area by type */}
        {isSingle ? (
          <div className="space-y-2">
            {options.map((o, oi) => (
              <OptionButton
                key={o.id}
                letter={LETTERS[oi] ?? "?"}
                content={o.content}
                selected={draft.optionId === o.id}
                multi={false}
                onClick={() => { setDraft(qq.id, { optionId: o.id }); void saveAnswer(qq, { optionId: o.id }); }}
              />
            ))}
          </div>
        ) : isMulti ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select all that apply.</p>
            {options.map((o, oi) => {
              const checked = (draft.optionIds ?? []).includes(o.id);
              return (
                <OptionButton
                  key={o.id}
                  letter={LETTERS[oi] ?? "?"}
                  content={o.content}
                  selected={checked}
                  multi
                  onClick={() => {
                    const set = new Set(draft.optionIds ?? []);
                    if (checked) set.delete(o.id); else set.add(o.id);
                    const optionIds = Array.from(set);
                    setDraft(qq.id, { optionIds });
                    void saveAnswer(qq, { optionIds });
                  }}
                />
              );
            })}
          </div>
        ) : qq.questionType === "FILL_BLANK" ? (
          <div className="space-y-1.5">
            <Input
              value={draft.text ?? ""}
              onChange={(e) => setDraft(qq.id, { text: e.target.value })}
              onBlur={() => { if ((draft.text ?? "").trim()) void saveAnswer(qq, { text: draft.text }); }}
              placeholder="Type your answer…"
              className={cn("h-11", qq.isAnswered && "border-primary/40")}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {qq.isAnswered ? (
                <><Check className="size-3.5 text-green-600" /> Answer saved — you can still edit it.</>
              ) : (
                "Your answer saves automatically."
              )}
            </p>
          </div>
        ) : (
          /* Hidden for now: WRITING / MATCHING / ORDERING / LISTENING. */
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
            This question type ({qq.questionType}) is not yet supported.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-border px-3 sm:px-4 py-2 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{quiz?.title}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {answeredCount} of {questions.length} answered · Page {safePage + 1}/{totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {timeRemaining != null && (
            <span className={cn("flex items-center gap-1.5 text-sm font-mono tabular-nums px-3 py-1.5 rounded-lg transition-colors",
              timeRemaining < 60 ? "bg-red-500/15 text-red-600 animate-pulse" : "bg-muted text-foreground")}>
              <Clock className="size-4" />{formatSeconds(timeRemaining)}
            </span>
          )}
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
            <Send className="size-4 mr-1" /> Submit
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted shrink-0" aria-hidden>
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Body + right-hand navigator */}
      <div className="flex-1 min-h-0 flex">
        {/* Main: the current page of questions (scrolls, scrollbar hidden) */}
        <ScrollHintContainer className="flex-1">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
            {pageQuestions.map((qq, li) => renderQuestion(qq, pageStart + li))}

            {/* Page navigation */}
            <div className="flex items-center justify-between gap-3 pt-1">
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
        <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-border bg-muted/20">
          <div className="px-3 py-2.5 border-b border-border space-y-2.5">
            <p className="text-sm font-semibold">Question navigator</p>
            {/* Questions per page */}
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {PAGE_SIZES.map((s) => (
                <button key={s} type="button" onClick={() => setPageSize(s)}
                  className={cn("flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    pageSize === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {s}/page
                </button>
              ))}
            </div>
            {/* Summary pills */}
            <div className="grid grid-cols-3 gap-1.5">
              <SummaryPill n={answeredCount} label="Done" className="bg-green-500/10 text-green-600" />
              <SummaryPill n={questions.length - answeredCount} label="Left" className="bg-muted text-muted-foreground" />
              <SummaryPill n={flagged.size} label="Marked" className="bg-amber-500/10 text-amber-600" />
            </div>
          </div>

          <ScrollHintContainer className="flex-1" viewportClassName="px-3 py-2.5">
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((qq, i) => {
                const onPage = i >= pageStart && i < pageEnd;
                const marked = flagged.has(qq.id);
                return (
                  <button key={qq.id} onClick={() => goToQuestion(i)}
                    className={cn("relative flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition-colors",
                      onPage && "ring-1 ring-primary",
                      qq.isAnswered
                        ? "bg-green-500/15 border-green-500/30 text-green-600"
                        : "bg-background border-border text-muted-foreground hover:bg-accent",
                      // Marked questions: border takes the amber mark colour.
                      marked && "border-amber-400")}>
                    {i + 1}
                    {marked && (
                      <Star className="absolute -top-1.5 -right-1.5 size-3.5 fill-amber-400 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-3">
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-green-500/20" />Answered</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm border border-border" />Unanswered</span>
              <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-500" />Marked</span>
            </div>
          </ScrollHintContainer>

          {/* Page Prev / Next */}
          <div className="px-3 py-2.5 border-t border-border flex items-center gap-2">
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
      <footer className="md:hidden border-t border-border px-3 py-2 shrink-0 flex items-center justify-between gap-3">
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
              You answered {answeredCount} of {questions.length} questions
              {answeredCount < questions.length && ` — ${questions.length - answeredCount} still unanswered`}.
              You can't change answers after submitting.
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

/* ── A single answer option with a letter badge (radio or checkbox style) ── */
function OptionButton({
  letter, content, selected, multi, onClick,
}: {
  letter: string;
  content: string;
  selected: boolean;
  multi: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent/30",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center border text-sm font-semibold transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30 text-muted-foreground",
        )}
      >
        {selected ? <Check className="size-4" /> : letter}
      </span>
      <span className="text-sm flex-1">{content}</span>
    </button>
  );
}

function SummaryPill({ n, label, className }: { n: number; label: string; className?: string }) {
  return (
    <div className={cn("rounded-lg px-2 py-1.5 text-center", className)}>
      <p className="text-base font-bold tabular-nums leading-none">{n}</p>
      <p className="text-[10px] font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
