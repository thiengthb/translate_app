import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, PenLine, RotateCcw, X } from "lucide-react";
import { quizletStudyApi } from "@/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { CardFace } from "../CardFace";
import { gradeTypedAnswer, sideText } from "../cardContent";
import type { StudyCard, StudyModeProps } from "../types";

type Feedback = { correct: boolean; answer: string } | null;

/**
 * Type-the-answer mode. Prompt = front; the learner types the back, which is
 * graded leniently (trim / lowercase / punctuation-insensitive, substring
 * match). An "I was right" override handles acceptable variants. Recorded to
 * the Quizlet tables — never SRS.
 */
export function WriteMode({ deckId, cards, fullView }: StudyModeProps) {
  const [queue, setQueue] = useState<StudyCard[]>(() => [...cards]);
  const [mastered, setMastered] = useState(0);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQueue([...cards]);
    setMastered(0);
    setValue("");
    setFeedback(null);
    setDone(false);
  }, [cards]);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (!feedback) inputRef.current?.focus();
  }, [feedback, current?.deckItemId]);

  const record = useCallback(
    (card: StudyCard, correct: boolean) => {
      if (card.flashcard.id == null) return;
      quizletStudyApi
        .answer({ deckId, flashcardId: card.flashcard.id, mode: "WRITE", correct })
        .catch((err) => logger.warn("Failed to record write answer", err));
    },
    [deckId]
  );

  const submit = () => {
    if (!current || feedback) return;
    const correct = gradeTypedAnswer(current.flashcard, "BACK", value);
    record(current, correct);
    setFeedback({ correct, answer: sideText(current.flashcard, "BACK") });
  };

  const advance = useCallback(
    (treatCorrect: boolean) => {
      setQueue((prev) => {
        const [head, ...rest] = prev;
        if (treatCorrect) {
          setMastered((m) => m + 1);
          if (rest.length === 0) setDone(true);
          return rest;
        }
        return [...rest, head];
      });
      setValue("");
      setFeedback(null);
    },
    []
  );

  const overrideCorrect = () => advance(true);

  /* Enter submits, then Enter continues */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!feedback) {
        e.preventDefault();
        submit();
      } else {
        e.preventDefault();
        advance(feedback.correct);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, value, current]);

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
          <PenLine className="size-10 text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold text-foreground">Nicely written!</h2>
          <p className="text-sm text-muted-foreground">You completed all {cards.length} cards.</p>
        </div>
        <button
          onClick={() => {
            setQueue([...cards]);
            setMastered(0);
            setDone(false);
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="size-4" />
          Write again
        </button>
      </motion.div>
    );
  }

  if (!current) return null;
  const progress = cards.length > 0 ? (mastered / cards.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Write</span>
          <span>
            <span className="font-semibold text-foreground">{mastered}</span>
            <span className="mx-0.5 opacity-50">/</span>
            <span>{cards.length}</span> done
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      <div className={cn("flex items-center justify-center rounded-2xl border border-border bg-card px-8 py-8 shadow-sm", fullView ? "min-h-[40vh]" : "min-h-44")}>
        <CardFace flashcard={current.flashcard} side="FRONT" large={fullView} />
      </div>

      {/* Input / feedback */}
      <div className="space-y-3">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!!feedback}
          placeholder="Type the answer…"
          className={cn(
            "w-full rounded-xl border-2 bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring",
            !feedback && "border-border",
            feedback?.correct && "border-green-500 bg-green-500/5",
            feedback && !feedback.correct && "border-destructive bg-destructive/5"
          )}
        />

        {feedback ? (
          <div className="space-y-3">
            {feedback.correct ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                <Check className="size-4" /> Correct!
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <X className="size-4" /> Not quite — correct answer:
                </div>
                <p className="whitespace-pre-line rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                  {feedback.answer}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => advance(feedback.correct)}
                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Continue
              </button>
              {!feedback.correct && (
                <button
                  onClick={overrideCorrect}
                  className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  I was right
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={submit}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Check
          </button>
        )}
      </div>
    </div>
  );
}
