import { useCallback, useMemo, useState } from "react";
import type { TypingResult } from "../types/kanaShark.types";
import { kanaSharkApi } from "../services/kanaSharkApi";

export function useSrsReviewSubmitQueue() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const [failedResults, setFailedResults] = useState<TypingResult[]>([]);

  const submitResults = useCallback(async (results: TypingResult[], options?: { append?: boolean }) => {
    if (results.length === 0) {
      if (!options?.append) setSubmitted(0);
      setFailedResults([]);
      return;
    }

    setSubmitting(true);
    const failed: TypingResult[] = [];
    let ok = 0;

    for (const result of results) {
      try {
        await kanaSharkApi.submitReview({
          deckId: result.item.deckId,
          flashcardId: result.item.flashcardId,
          rating: result.rating,
          score: result.score,
          timeTakenMs: result.timeTakenMs,
          sourceType: "KANA_SHARK",
        });
        ok++;
      } catch {
        failed.push(result);
      }
    }

    setSubmitted((current) => (options?.append ? current + ok : ok));
    setFailedResults(failed);
    setSubmitting(false);
  }, []);

  const resetSubmitState = useCallback(() => {
    setSubmitting(false);
    setSubmitted(0);
    setFailedResults([]);
  }, []);

  return useMemo(
    () => ({
      submitting,
      submitted,
      failedResults,
      submitResults,
      resetSubmitState,
      retryFailed: () => submitResults(failedResults, { append: true }),
    }),
    [failedResults, resetSubmitState, submitResults, submitted, submitting],
  );
}
