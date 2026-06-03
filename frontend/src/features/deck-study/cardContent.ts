import type { FlashcardDTO } from "@/types";
import type { StudySide } from "./types";

/**
 * Card-content extraction helpers shared by every non-template study mode.
 *
 * These read the modern `sides` structure and fall back to the legacy
 * `front`/`back`/`imageUrl`/`audioUrl` fields. Previously duplicated inside
 * FlashcardStudyPage and AnkiStudyPage — kept in one place so all modes render
 * cards identically.
 */

/** All TEXT/CLOZE blocks from a side. Falls back to the legacy single field. */
export function getSideTextBlocks(fc: FlashcardDTO, side: StudySide): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const blocks = found.contents
      .filter((c) => c.contentType === "TEXT" || c.contentType === "CLOZE")
      .map((c) => c.contentValue)
      .filter(Boolean);
    if (blocks.length > 0) return blocks;
  }
  const legacy = side === "FRONT" ? fc.front : fc.back;
  return legacy ? legacy.split("\n").filter(Boolean) : [""];
}

export function getSideImages(fc: FlashcardDTO, side: StudySide): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const imgs = found.contents
      .filter((c) => c.contentType === "IMAGE")
      .map((c) => c.contentValue)
      .filter(Boolean);
    if (imgs.length > 0) return imgs;
  }
  return fc.imageUrl ? [fc.imageUrl] : [];
}

export function getSideAudio(fc: FlashcardDTO, side: StudySide): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const audios = found.contents
      .filter((c) => c.contentType === "AUDIO")
      .map((c) => c.contentValue)
      .filter(Boolean);
    if (audios.length > 0) return audios;
  }
  return fc.audioUrl ? [fc.audioUrl] : [];
}

export function getSideVideos(fc: FlashcardDTO, side: StudySide): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    return found.contents
      .filter((c) => c.contentType === "VIDEO")
      .map((c) => c.contentValue)
      .filter(Boolean);
  }
  return [];
}

/**
 * Single short representative string for a side — the first text block, with
 * the rest appended on new lines. Used by Learn/Match/Write/Quiz to label a
 * card and to grade typed answers.
 */
export function sideText(fc: FlashcardDTO, side: StudySide): string {
  return getSideTextBlocks(fc, side).join("\n").trim();
}

/** Normalise a typed answer for forgiving comparison (Write/Quiz grading). */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s　]+/g, " ")
    .replace(/[.,!?;:。、！？；：「」『』（）()]/g, "");
}

/** True when a typed answer matches any text block of the target side. */
export function gradeTypedAnswer(fc: FlashcardDTO, side: StudySide, typed: string): boolean {
  const guess = normalizeAnswer(typed);
  if (!guess) return false;
  return getSideTextBlocks(fc, side).some((block) => {
    const target = normalizeAnswer(block);
    if (!target) return false;
    // Accept exact match, or either side fully containing the other (handles
    // multi-word definitions where the learner typed the key term).
    return target === guess || target.includes(guess) || guess.includes(target);
  });
}
