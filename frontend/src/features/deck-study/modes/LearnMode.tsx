import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, GraduationCap, RotateCcw, X } from "lucide-react";
import { quizletStudyApi } from "@/api";
import type { QuizletProgressDTO } from "@/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { CardFace } from "../CardFace";
import { StudyMessage } from "../StudyMessage";
import { buildChoices } from "../quizUtils";
import type { StudyCard, StudyModeProps } from "../types";

interface Question {
  card: StudyCard;
  options: string[];
  answer: string;
}

/**
 * In-memory cache of the Learn queue per deck so switching to another mode and
 * back resumes instead of restarting. (Each answer is also persisted to the
 * backend Quizlet progress, which seeds the queue on a cold start / reload.)
 */
const learnSessionCache = new Map<number, { cachedAt: number; queue: StudyCard[] }>();
const LEARN_CACHE_TTL_MS = 10 * 60 * 1000;

/** A card is "learned" (kept out of the queue) when its last saved answer was correct. */
function isLearned(card: StudyCard, progress?: Map<number, QuizletProgressDTO>): boolean {
  const id = card.flashcard.id;
  return id != null && progress?.get(id)?.lastAnswerCorrect === true;
}

function buildQueue(cards: StudyCard[], progress?: Map<number, QuizletProgressDTO>): StudyCard[] {
  return cards.filter((c) => !isLearned(c, progress));
}

/**
 * Adaptive multiple-choice learning. Prompt = front, choose the matching back
 * from four options; wrong cards cycle back until every card is answered
 * correctly. Each answer is recorded to the Quizlet tables — never SRS.
 */
export function LearnMode({ deckId, cards, fullView, progress, onCurrentCard }: StudyModeProps) {
  const [queue, setQueue] = useState<StudyCard[]>(() => buildQueue(cards, progress));
  const [picked, setPicked] = useState<string | null>(null);

  // Resume: use the cached session (recent mode switch) if fresh, otherwise
  // seed from the backend progress so already-learned cards are skipped.
  useEffect(() => {
    const cached = learnSessionCache.get(deckId);
    if (cached && Date.now() - cached.cachedAt < LEARN_CACHE_TTL_MS) {
      setQueue(cached.queue);
    } else {
      setQueue(buildQueue(cards, progress));
    }
    setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Persist the live queue so it survives a mode switch (remount).
  useEffect(() => {
    learnSessionCache.set(deckId, { cachedAt: Date.now(), queue });
  }, [deckId, queue]);

  const current = queue[0] ?? null;
  // Derived (never a separate counter) so the total can't be exceeded.
  const mastered = Math.max(0, cards.length - queue.length);
  const done = queue.length === 0;

  /* Report the prompted card up to the shell so "Sửa thẻ hiện tại" targets it,
     and clear it on unmount so the next mode starts from a clean target. */
  useEffect(() => {
    onCurrentCard?.(current?.flashcard.id ?? null);
  }, [current?.flashcard.id, onCurrentCard]);
  useEffect(() => () => onCurrentCard?.(null), [onCurrentCard]);

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
    const correct = option === question.answer;
    setPicked(option);
    record(question.card, correct);

    window.setTimeout(() => {
      setPicked(null);
      // Pure update: correct removes the card, wrong recycles it to the back.
      setQueue((prev) => {
        const [head, ...rest] = prev;
        return correct ? rest : [...rest, head];
      });
    }, 650);
  };

  const restart = () => setQueue([...cards]);

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
      <StudyMessage
        icon={<GraduationCap size={26} />}
        title="Learned!"
        description={`You answered all ${cards.length} cards correctly.`}
        action={{ label: "Learn again", icon: <RotateCcw className="size-4" />, onClick: restart }}
      />
    );
  }

  if (!current || !question) return null;
  const progressPct = cards.length > 0 ? (mastered / cards.length) * 100 : 0;

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
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
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
