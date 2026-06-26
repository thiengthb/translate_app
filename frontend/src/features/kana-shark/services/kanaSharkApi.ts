import { ankiStudyApi } from "@/api";
import type { SrsReviewMetadata } from "../types/kanaShark.types";

export const kanaSharkApi = {
  submitReview: (review: SrsReviewMetadata) =>
    ankiStudyApi.review({
      deckId: review.deckId,
      flashcardId: review.flashcardId,
      rating: review.rating,
      score: review.score,
      timeTakenMs: review.timeTakenMs,
      sourceType: review.sourceType,
    }),
};
