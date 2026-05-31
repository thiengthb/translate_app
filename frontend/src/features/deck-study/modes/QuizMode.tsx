import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ListChecks, RotateCcw, X } from "lucide-react";
import { quizletStudyApi } from "@/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { CardFace } from "../CardFace";
import { gradeTypedAnswer, sideText } from "../cardContent";
import { buildChoices, shuffle } from "../quizUtils";
import type { StudyCard, StudyModeProps } from "../types";

const QUIZ_SIZE = 10;

interface QuizQuestion {
  card: StudyCard;
  type: "mcq" | "write";
  options?: string[];
  answer: string;
}

function buildQuiz(cards: StudyCard[]): QuizQuestion[] {
  const chosen = shuffle(cards).slice(0, Math.min(QUIZ_SIZE, cards.length));
  return chosen.map((card, i) => {
    const type: QuizQuestion["type"] = i % 2 === 0 ? "mcq" : "write";
    if (type === "mcq") {
      const { options, answer } = buildChoices(cards, card, "BACK", 4);
      return { card, type, options, answer };
    }
    return { card, type, answer: sideText(card.flashcard, "BACK") };
  });
}

/**
 * A graded test mixing multiple-choice and written questions. No feedback until
 * the end, then a score + per-question review. Each answer and the session are
 * recorded to the Quizlet tables — never SRS.
 */
export function QuizMode({ deckId, cards, fullView }: StudyModeProps) {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildQuiz(cards), [cards, round]);

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>(() => questions.map(() => ""));
  const [finished, setFinished] = useState(false);

  const reset = useCallback(() => {
    setRound((r) => r + 1);
    setIndex(0);
    setResponses(cards.slice(0, Math.min(QUIZ_SIZE, cards.length)).map(() => ""));
    setFinished(false);
  }, [cards]);

  const setResponse = (value: string) =>
    setResponses((prev) => prev.map((r, i) => (i === index ? value : r)));

  const grade = (q: QuizQuestion, response: string): boolean =>
    q.type === "mcq" ? response === q.answer : gradeTypedAnswer(q.card.flashcard, "BACK", response);

  const finish = () => {
    const now = new Date();
    questions.forEach((q, i) => {
      const correct = grade(q, responses[i]);
      if (q.card.flashcard.id != null) {
        quizletStudyApi
          .answer({ deckId, flashcardId: q.card.flashcard.id, mode: "QUIZ", correct })
          .catch((err) => logger.warn("Failed to record quiz answer", err));
      }
    });
    quizletStudyApi
      .logSession({
        deckId,
        mode: "QUIZ",
        totalItems: questions.length,
        completedItems: responses.filter(Boolean).length,
        startedAt: now.toISOString(),
        endedAt: now.toISOString(),
      })
      .catch((err) => logger.warn("Failed to log quiz session", err));
    setFinished(true);
  };

  if (questions.length === 0) return null;

  if (finished) {
    const score = questions.reduce((acc, q, i) => acc + (grade(q, responses[i]) ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-8">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <ListChecks className="size-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            {score} / {questions.length}
          </h2>
          <p className="text-sm text-muted-foreground">{pct}% correct</p>
          <button
            onClick={reset}
            className="mt-2 flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RotateCcw className="size-4" />
            Retake quiz
          </button>
        </motion.div>

        <div className="space-y-2">
          {questions.map((q, i) => {
            const correct = grade(q, responses[i]);
            return (
              <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      correct ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive"
                    )}
                  >
                    {correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                  <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="font-semibold text-foreground">{sideText(q.card.flashcard, "FRONT")}</p>
                    <p className="text-muted-foreground">
                      Your answer: <span className={cn(correct ? "text-green-600" : "text-destructive")}>{responses[i] || "—"}</span>
                    </p>
                    {!correct && <p className="text-muted-foreground">Correct: <span className="text-foreground">{q.answer}</span></p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = questions[index];
  const response = responses[index];
  const isLast = index === questions.length - 1;
  const canAdvance = response.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Quiz</span>
          <span>
            Question <span className="font-semibold text-foreground">{index + 1}</span>
            <span className="mx-0.5 opacity-50">/</span>
            {questions.length}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className={cn("flex items-center justify-center rounded-2xl border border-border bg-card px-8 py-8 shadow-sm", fullView ? "min-h-[36vh]" : "min-h-40")}>
        <CardFace flashcard={q.card.flashcard} side="FRONT" large={fullView} />
      </div>

      {q.type === "mcq" ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {q.options!.map((option, i) => (
            <button
              key={`${option}-${i}`}
              onClick={() => setResponse(option)}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                response === option ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
              <span className="whitespace-pre-line">{option}</span>
            </button>
          ))}
        </div>
      ) : (
        <input
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAdvance) (isLast ? finish() : setIndex((n) => n + 1));
          }}
          placeholder="Type the answer…"
          className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setIndex((n) => Math.max(0, n - 1))}
          disabled={index === 0}
          className="h-10 rounded-xl border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={() => (isLast ? finish() : setIndex((n) => n + 1))}
          disabled={!canAdvance}
          className="h-10 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
