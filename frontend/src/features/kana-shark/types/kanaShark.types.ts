import type { AnkiRating, AnkiStudyCard } from "@/api";

export type KanaSharkGameStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "finished"
  | "error";

export type KanaSharkMode = "ROMAJI" | "KANA";

export type KanaSharkPerformanceMode = "balanced" | "performance";

export type SrsRating = AnkiRating;

export interface KanaSharkSettings {
  mode: KanaSharkMode;
  roundSeconds: number;
  maxItems: number;
  maxHp: number;
  maxEnemies: number;
  performanceMode: KanaSharkPerformanceMode;
}

export interface SrsItem {
  deckId: number;
  flashcardId: number;
  prompt: string;
  expectedAnswers: string[];
  displayAnswer: string;
  rawCard: AnkiStudyCard;
  state: AnkiStudyCard["state"];
  lapses: number;
  reviewCount: number;
  difficulty: number;
}

export interface KanaSharkEnemy {
  id: string;
  item: SrsItem;
  lane: number;
  speed: number;
  spawnedAt: number;
  mistakes: number;
}

export interface KanaSharkSceneEnemy {
  id: string;
  prompt: string;
  lane: number;
  speed: number;
  danger: boolean;
}

export interface TypingResult {
  id: string;
  item: SrsItem;
  correct: boolean;
  rating: SrsRating;
  score: number;
  timeTakenMs: number;
  mistakes: number;
}

export interface KanaSharkSummary {
  totalItems: number;
  correct: number;
  missed: number;
  accuracy: number;
  averageResponseMs: number;
  maxCombo: number;
  score: number;
  ratingCounts: Record<SrsRating, number>;
  submitted: number;
  failed: number;
}

export interface SrsReviewMetadata {
  deckId: number;
  flashcardId: number;
  rating: SrsRating;
  score: number;
  timeTakenMs: number;
  sourceType: "KANA_SHARK";
}
