import type { SrsRating } from "../types/kanaShark.types";

export function ratingToScore(rating: SrsRating, combo: number): number {
  const base = {
    AGAIN: 0,
    HARD: 80,
    GOOD: 140,
    EASY: 210,
  }[rating];

  return Math.round(base * (1 + Math.min(combo, 12) * 0.08));
}
