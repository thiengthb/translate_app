import type { StudyCard, StudySide } from "./types";
import { sideText } from "./cardContent";

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build multiple-choice options for a card: the correct side text plus up to
 * `count-1` distractors drawn from other cards' same side. Deduped and shuffled.
 */
export function buildChoices(
  all: StudyCard[],
  correct: StudyCard,
  side: StudySide,
  count = 4
): { options: string[]; answer: string } {
  const answer = sideText(correct.flashcard, side);
  const pool = Array.from(
    new Set(
      all
        .filter((c) => c.deckItemId !== correct.deckItemId)
        .map((c) => sideText(c.flashcard, side))
        .filter((t) => t && t !== answer)
    )
  );
  const distractors = shuffle(pool).slice(0, Math.max(0, count - 1));
  return { options: shuffle([answer, ...distractors]), answer };
}
