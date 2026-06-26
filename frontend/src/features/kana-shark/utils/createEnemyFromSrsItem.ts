import { isKana, toRomaji } from "wanakana";
import type { AnkiStudyCard } from "@/api";
import type { KanaSharkMode, SrsItem } from "../types/kanaShark.types";
import { normalizeRomaji } from "./normalizeRomaji";

const JAPANESE_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const KANA_RE = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const KANA_TOKEN_RE = /[\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu;
const HAN_TOKEN_RE = /[\p{Script=Han}々]+/gu;
const LATIN_RE = /^[a-zA-Z\s.'-]+$/;
const SKIP_HAN_TOKENS = new Set(["例", "例文", "文", "訳", "意味"]);

export function createSrsItemFromCard(deckId: number, card: AnkiStudyCard, mode: KanaSharkMode): SrsItem | null {
  const frontLines = splitLines(card.front);
  const backLines = splitLines(card.back);
  const prompt = pickPrompt(frontLines);
  if (!prompt) return null;

  const expectedAnswers = collectExpectedAnswers(prompt, frontLines, backLines, mode);
  if (expectedAnswers.length === 0) return null;

  return {
    deckId,
    flashcardId: card.flashcardId,
    prompt,
    expectedAnswers,
    displayAnswer: expectedAnswers[0],
    rawCard: card,
    state: card.state,
    lapses: card.lapses ?? 0,
    reviewCount: card.reviewCount ?? 0,
    difficulty: estimateDifficulty(card),
  };
}

function pickPrompt(frontLines: string[]): string {
  for (const line of frontLines) {
    const hanToken = extractHanTokens(line).find((token) => !SKIP_HAN_TOKENS.has(token) && token.length <= 8);
    if (hanToken) return hanToken;
  }

  for (const line of frontLines) {
    const kanaToken = extractKanaTokens(line)[0];
    if (kanaToken) return kanaToken;
  }

  return frontLines.find((line) => JAPANESE_RE.test(line)) ?? frontLines[0] ?? "";
}

function collectExpectedAnswers(
  prompt: string,
  frontLines: string[],
  backLines: string[],
  mode: KanaSharkMode,
): string[] {
  const answers = new Set<string>();
  const candidateLines = frontLines.filter((line) => line !== prompt);
  const kanaSearchLines = [...frontLines, ...backLines];

  for (const line of candidateLines) {
    if (mode === "ROMAJI") {
      if (LATIN_RE.test(line) && normalizeRomaji(line).length >= 2) {
        answers.add(line);
      } else if (containsKanaOnly(line)) {
        answers.add(toRomaji(line));
      }
    } else if (containsKanaOnly(line)) {
      answers.add(line);
    }
  }

  for (const line of kanaSearchLines) {
    for (const kana of extractKanaTokens(line)) {
      answers.add(mode === "ROMAJI" ? toRomaji(kana) : kana);
    }
  }

  return [...answers]
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0)
    .slice(0, 5);
}

function splitLines(value?: string): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function containsKanaOnly(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  return compact.length > 0 && KANA_RE.test(compact) && isKana(compact);
}

function extractKanaTokens(value: string): string[] {
  return [...value.matchAll(KANA_TOKEN_RE)]
    .map((match) => match[0].trim())
    .filter((token) => token.length > 0 && KANA_RE.test(token) && isKana(token.replace(/ー/g, "")));
}

function extractHanTokens(value: string): string[] {
  return [...value.matchAll(HAN_TOKEN_RE)].map((match) => match[0].trim()).filter(Boolean);
}

function estimateDifficulty(card: AnkiStudyCard): number {
  let difficulty = 1;
  if (card.state === "RELEARNING") difficulty += 0.45;
  if (card.state === "LEARNING") difficulty += 0.2;
  if ((card.lapses ?? 0) > 0) difficulty += Math.min(0.45, card.lapses * 0.12);
  if ((card.reviewCount ?? 0) === 0) difficulty -= 0.1;
  return Math.max(0.8, Math.min(1.8, difficulty));
}
