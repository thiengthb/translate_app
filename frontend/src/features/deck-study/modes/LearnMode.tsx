import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, GraduationCap, RotateCcw, X } from "lucide-react";
import { quizletStudyApi } from "@/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { CardFace } from "../CardFace";
import { buildChoices } from "../quizUtils";
import type { StudyCard, StudyModeProps } from "../types";

interface Question {
  card: StudyCard;
  options: string[];
  answer: string;
}

function buildQueue(cards: StudyCard[]): StudyCard[] {
  return [...cards];
}

/**
 * Adaptive multiple-choice learning. Prompt = front, choose the matching back
 * from four options; wrong cards cycle back until every card is answered
 * correctly. Each answer is recorded to the Quizlet tables — never SRS.
 */
export function LearnMode({ deckId, cards, fullView }: StudyModeProps) {
  const [queue, setQueue] = useState<StudyCard[]>(() => buildQueue(cards));
  const [mastered, setMastered] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setQueue(buildQueue(cards));
    setMastered(0);
    setPicked(null);
    setDone(false);
  }, [cards]);

  const current = queue[0] ?? null;

  const question = useMemo<Question | null>(() => {
    if (!current) return null;
    const { options, answer } = buildChoices(cards, current, "BACK", 4);
    return { card: current, options, answer };
    // Rebuild only when the prompted card changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.deckItemId, cards]);

  const record = useCallback(
    (card: StudyCard, correct: boolean) => {
      if (card.flashcard.id == null) return;
      quizletStudyApi
        .answer({ deckId, flashcardId: card.flashcard.id, mode: "LEARN", correct })
        .catch((err) => logger.warn("Failed to record learn answer", err));
    },
    [deckId]
  );

  const choose = (option: string) => {
    if (picked != null || !question) return;
    setPicked(option);
    const correct = option === question.answer;
    record(question.card, correct);

    window.setTimeout(() => {
      setPicked(null);
      setQueue((prev) => {
        const [, ...rest] = prev;
        if (correct) {
          setMastered((m) => m + 1);
          if (rest.length === 0) {
            setDone(true);
            return rest;
          }
          return rest;
        }
        // Wrong: send the card to the back of the queue to revisit.
        return [...rest, prev[0]];
      });
    }, 650);
  };

  /* Keyboard 1-4 to pick */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!question || picked != null) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < question.options.length) choose(question.options[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, picked]);

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
          <GraduationCap className="size-10 text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold text-foreground">Learned!</h2>
          <p className="text-sm text-muted-foreground">You answered all {cards.length} cards correctly.</p>
        </div>
        <button
          onClick={() => {
            setQueue(buildQueue(cards));
            setMastered(0);
            setDone(false);
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="size-4" />
          Learn again
        </button>
      </motion.div>
    );
  }

  if (!current || !question) return null;
  const progress = cards.length > 0 ? (mastered / cards.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Learn</span>
          <span>
            <span className="font-semibold text-foreground">{mastered}</span>
            <span className="mx-0.5 opacity-50">/</span>
            <span>{cards.length}</span> mastered
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Prompt */}
      <div className={cn("flex items-center justify-center rounded-2xl border border-border bg-card px-8 py-8 shadow-sm", fullView ? "min-h-[40vh]" : "min-h-44")}>
        <CardFace flashcard={current.flashcard} side="FRONT" large={fullView} />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const isAnswer = option === question.answer;
          const isPicked = option === picked;
          const reveal = picked != null;
          return (
            <button
              key={`${option}-${i}`}
              onClick={() => choose(option)}
              disabled={reveal}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                !reveal && "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                reveal && isAnswer && "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
                reveal && isPicked && !isAnswer && "border-destructive bg-destructive/10 text-destructive",
                reveal && !isAnswer && !isPicked && "border-border opacity-50"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {reveal && isAnswer ? <Check className="size-3.5" /> : reveal && isPicked ? <X className="size-3.5" /> : i + 1}
              </span>
              <span className="whitespace-pre-line">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
