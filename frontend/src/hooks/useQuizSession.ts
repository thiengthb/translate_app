import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assessmentApi } from "@/api";
import type {
  QuizAttemptDTO,
  QuizAttemptQuestionDTO,
  QuizDTO,
  SubmitAnswerRequest,
} from "@/types";

interface UseQuizSessionResult {
  attempt: QuizAttemptDTO | null;
  quiz: QuizDTO | null;
  loading: boolean;
  currentIndex: number;
  currentQuestion: QuizAttemptQuestionDTO | null;
  timeRemaining: number | null; // seconds, or null if no time limit
  submitting: boolean;
  goToQuestion: (index: number) => void;
  next: () => void;
  prev: () => void;
  submitAnswer: (req: SubmitAnswerRequest) => Promise<void>;
  finish: () => Promise<QuizAttemptDTO | null>;
}

export function useQuizSession(quizId: number, attemptId: number): UseQuizSessionResult {
  const [attempt, setAttempt] = useState<QuizAttemptDTO | null>(null);
  const [quiz, setQuiz] = useState<QuizDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const finishedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  /* ── Initial load ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([assessmentApi.getAttempt(attemptId), assessmentApi.fetchQuizById(quizId)])
      .then(([attemptData, quizData]) => {
        if (cancelled) return;
        setAttempt(attemptData);
        setQuiz(quizData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId, quizId]);

  const finish = useCallback(async (): Promise<QuizAttemptDTO | null> => {
    if (finishedRef.current) return attempt;
    finishedRef.current = true;
    setSubmitting(true);
    try {
      const result = await assessmentApi.submitAttempt(attemptId);
      setAttempt(result);
      return result;
    } catch {
      finishedRef.current = false;
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, attempt]);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (!attempt || !quiz?.timeLimitMinutes) {
      setTimeRemaining(null);
      return;
    }
    const startedMs = new Date(attempt.startedAt).getTime();
    const deadlineMs = startedMs + quiz.timeLimitMinutes * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        void finish();
      }
    };
    tick();
    intervalRef.current = window.setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [attempt, quiz, finish]);

  const questions = attempt?.attemptQuestions ?? [];
  const currentQuestion = questions[currentIndex] ?? null;

  const goToQuestion = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      setCurrentIndex(index);
    },
    [questions.length]
  );

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, Math.max(0, questions.length - 1)));
  }, [questions.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const submitAnswer = useCallback(
    async (req: SubmitAnswerRequest) => {
      const updated = await assessmentApi.submitAnswer(attemptId, req);
      setAttempt(updated);
    },
    [attemptId]
  );

  return useMemo(
    () => ({
      attempt,
      quiz,
      loading,
      currentIndex,
      currentQuestion,
      timeRemaining,
      submitting,
      goToQuestion,
      next,
      prev,
      submitAnswer,
      finish,
    }),
    [attempt, quiz, loading, currentIndex, currentQuestion, timeRemaining, submitting, goToQuestion, next, prev, submitAnswer, finish]
  );
}
