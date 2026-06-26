import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KanaSharkEnemy,
  KanaSharkGameStatus,
  KanaSharkSceneEnemy,
  KanaSharkSettings,
  KanaSharkSummary,
  SrsItem,
  SrsRating,
  TypingResult,
} from "../types/kanaShark.types";
import { calculateTypingRating } from "../utils/calculateTypingRating";
import { isAnswerAccepted } from "../utils/isAnswerAccepted";
import { ratingToScore } from "../utils/ratingToScore";

const SPAWN_INTERVAL_MS = 1250;
const TIMER_INTERVAL_MS = 250;

export function useKanaSharkGame(settings: KanaSharkSettings) {
  const [status, setStatus] = useState<KanaSharkGameStatus>("idle");
  const [hp, setHp] = useState(settings.maxHp);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(settings.roundSeconds);
  const [activeEnemies, setActiveEnemies] = useState<KanaSharkEnemy[]>([]);
  const [results, setResults] = useState<TypingResult[]>([]);

  const queueRef = useRef<SrsItem[]>([]);
  const statusRef = useRef<KanaSharkGameStatus>("idle");
  const hpRef = useRef(settings.maxHp);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);
  const resultsRef = useRef<TypingResult[]>([]);
  const activeEnemiesRef = useRef<KanaSharkEnemy[]>([]);
  const endAtRef = useRef(0);
  const spawnCounterRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    activeEnemiesRef.current = activeEnemies;
  }, [activeEnemies]);

  const finishRound = useCallback(() => {
    if (statusRef.current === "finished") return;
    statusRef.current = "finished";
    setStatus("finished");
    setActiveEnemies([]);
    queueRef.current = [];
  }, []);

  const start = useCallback(
    (items: SrsItem[]) => {
      const playable = items.slice(0, settings.maxItems);
      queueRef.current = playable;
      resultsRef.current = [];
      activeEnemiesRef.current = [];
      hpRef.current = settings.maxHp;
      comboRef.current = 0;
      maxComboRef.current = 0;
      scoreRef.current = 0;
      spawnCounterRef.current = 0;
      endAtRef.current = Date.now() + settings.roundSeconds * 1000;

      setHp(settings.maxHp);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setSecondsLeft(settings.roundSeconds);
      setResults([]);
      setActiveEnemies([]);
      setStatus(playable.length > 0 ? "playing" : "ready");
      statusRef.current = playable.length > 0 ? "playing" : "ready";
    },
    [settings.maxHp, settings.maxItems, settings.roundSeconds],
  );

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return;
    setStatus("paused");
    statusRef.current = "paused";
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    const remainingMs = Math.max(0, secondsLeft * 1000);
    endAtRef.current = Date.now() + remainingMs;
    setStatus("playing");
    statusRef.current = "playing";
  }, [secondsLeft]);

  const reset = useCallback(() => {
    queueRef.current = [];
    resultsRef.current = [];
    activeEnemiesRef.current = [];
    statusRef.current = "idle";
    hpRef.current = settings.maxHp;
    comboRef.current = 0;
    maxComboRef.current = 0;
    scoreRef.current = 0;
    setStatus("idle");
    setHp(settings.maxHp);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setSecondsLeft(settings.roundSeconds);
    setResults([]);
    setActiveEnemies([]);
  }, [settings.maxHp, settings.roundSeconds]);

  const recordResult = useCallback((result: TypingResult) => {
    resultsRef.current = [...resultsRef.current, result];
    setResults(resultsRef.current);
  }, []);

  const killEnemy = useCallback(
    (enemy: KanaSharkEnemy) => {
      const timeTakenMs = Date.now() - enemy.spawnedAt;
      const rating = calculateTypingRating({
        correct: true,
        timeTakenMs,
        mistakes: enemy.mistakes,
        expectedLength: enemy.item.displayAnswer.length,
      });

      const nextCombo = comboRef.current + 1;
      const gained = ratingToScore(rating, nextCombo);
      comboRef.current = nextCombo;
      maxComboRef.current = Math.max(maxComboRef.current, nextCombo);
      scoreRef.current += gained;

      setCombo(nextCombo);
      setMaxCombo(maxComboRef.current);
      setScore(scoreRef.current);
      setActiveEnemies((current) => {
        const next = current.filter((item) => item.id !== enemy.id);
        activeEnemiesRef.current = next;
        return next;
      });

      recordResult({
        id: enemy.id,
        item: enemy.item,
        correct: true,
        rating,
        score: gained,
        timeTakenMs,
        mistakes: enemy.mistakes,
      });
    },
    [recordResult],
  );

  const missEnemy = useCallback(
    (enemyId: string) => {
      const enemy = activeEnemiesRef.current.find((item) => item.id === enemyId);
      if (!enemy || statusRef.current !== "playing") return;

      comboRef.current = 0;
      hpRef.current = Math.max(0, hpRef.current - 1);
      setCombo(0);
      setHp(hpRef.current);
      setActiveEnemies((current) => {
        const next = current.filter((item) => item.id !== enemy.id);
        activeEnemiesRef.current = next;
        return next;
      });

      recordResult({
        id: enemy.id,
        item: enemy.item,
        correct: false,
        rating: "AGAIN",
        score: 0,
        timeTakenMs: Date.now() - enemy.spawnedAt,
        mistakes: enemy.mistakes,
      });

      if (hpRef.current <= 0) finishRound();
    },
    [finishRound, recordResult],
  );

  const submitInput = useCallback(
    (value: string, penalizeMiss = true): boolean => {
      if (statusRef.current !== "playing") return false;
      const enemy = activeEnemiesRef.current.find((item) => isAnswerAccepted(value, item.item.expectedAnswers));
      if (!enemy) {
        if (penalizeMiss && value.trim()) {
          setActiveEnemies((current) => {
            const next = current.map((item, index) =>
              index === 0 ? { ...item, mistakes: item.mistakes + 1 } : item,
            );
            activeEnemiesRef.current = next;
            return next;
          });
          comboRef.current = 0;
          setCombo(0);
        }
        return false;
      }

      killEnemy(enemy);
      return true;
    },
    [killEnemy],
  );

  useEffect(() => {
    if (status !== "playing") return;

    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) finishRound();
    }, TIMER_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [finishRound, status]);

  useEffect(() => {
    if (status !== "playing") return;

    const spawner = window.setInterval(() => {
      if (activeEnemiesRef.current.length >= settings.maxEnemies) return;
      const next = queueRef.current.shift();
      if (!next) {
        if (activeEnemiesRef.current.length === 0) finishRound();
        return;
      }

      const lane = spawnCounterRef.current % 4;
      const enemy: KanaSharkEnemy = {
        id: `${next.flashcardId}-${Date.now()}-${spawnCounterRef.current++}`,
        item: next,
        lane,
        speed: (0.72 + lane * 0.04) * next.difficulty,
        spawnedAt: Date.now(),
        mistakes: 0,
      };

      setActiveEnemies((current) => [...current, enemy]);
    }, SPAWN_INTERVAL_MS);

    return () => window.clearInterval(spawner);
  }, [finishRound, settings.maxEnemies, status]);

  const sceneEnemies: KanaSharkSceneEnemy[] = useMemo(
    () =>
      activeEnemies.map((enemy) => ({
        id: enemy.id,
        prompt: enemy.item.prompt,
        lane: enemy.lane,
        speed: enemy.speed,
        danger: enemy.mistakes >= 2,
      })),
    [activeEnemies],
  );

  const summary: KanaSharkSummary = useMemo(() => {
    const totalItems = results.length;
    const correct = results.filter((result) => result.correct).length;
    const missed = totalItems - correct;
    const averageResponseMs =
      totalItems > 0
        ? Math.round(results.reduce((sum, result) => sum + result.timeTakenMs, 0) / totalItems)
        : 0;
    const ratingCounts = results.reduce<Record<SrsRating, number>>(
      (acc, result) => {
        acc[result.rating] += 1;
        return acc;
      },
      { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 },
    );

    return {
      totalItems,
      correct,
      missed,
      accuracy: totalItems > 0 ? Math.round((correct / totalItems) * 100) : 0,
      averageResponseMs,
      maxCombo,
      score,
      ratingCounts,
      submitted: 0,
      failed: 0,
    };
  }, [maxCombo, results, score]);

  return {
    status,
    hp,
    score,
    combo,
    maxCombo,
    secondsLeft,
    activeEnemies,
    sceneEnemies,
    results,
    summary,
    currentTarget: activeEnemies[0]?.item ?? null,
    start,
    pause,
    resume,
    reset,
    finishRound,
    missEnemy,
    submitInput,
  };
}
