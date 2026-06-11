import type { SrsRating } from "../types/kanaShark.types";

interface RatingInput {
  correct: boolean;
  timeTakenMs: number;
  mistakes: number;
  expectedLength: number;
}

export function calculateTypingRating({
  correct,
  timeTakenMs,
  mistakes,
  expectedLength,
}: RatingInput): SrsRating {
  if (!correct) return "AGAIN";

  const targetMs = Math.max(2200, expectedLength * 420);
  if (mistakes === 0 && timeTakenMs <= targetMs) return "EASY";
  if (mistakes <= 1 && timeTakenMs <= targetMs * 2.2) return "GOOD";
  return "HARD";
}
