import axiosInstance from "@/api/axios";

export interface AnkiStudyCard {
  flashcardId: number;
  front: string;
  back: string;

  frontImages?: string[];
  frontAudios?: string[];
  frontVideos?: string[];

  backImages?: string[];
  backAudios?: string[];
  backVideos?: string[];

  progressId?: number;
  state: "NEW" | "LEARNING" | "REVIEW" | "RELEARNING";
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lapses: number;
  nextReviewAt?: string;

  againPreview?: string;
  hardPreview?: string;
  goodPreview?: string;
  easyPreview?: string;
}

export interface AnkiStudyQueue {
  deckTitle: string;
  cards: AnkiStudyCard[];
  totalNew: number;
  totalLearning?: number;
  totalReview?: number;
  dueReviewCards?: number;
  totalDue: number;
}

export type AnkiRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface AnkiReviewRequest {
  deckId: number;
  flashcardId: number;
  rating: AnkiRating;
}

/* ─────────────────────────────────────────
   Anki statistics types (mirrored from AnkiStatsDTO)
───────────────────────────────────────── */
export interface AnkiDayCount {
  dayOffset: number;
  count: number;
}

export interface AnkiBucketCount {
  label: string;
  count: number;
}

export interface AnkiStatsDTO {
  deckId: number;
  deckTitle: string;
  totalCards: number;
  newCards: number;
  learningCards: number;
  relearningCards: number;
  reviewCards: number;
  studiedToday: number;
  dueToday: number;
  dueTomorrow: number;
  dueReviewCards: number;
  avgMemoryScore: number;
  avgEaseFactor: number;
  avgIntervalDays: number;
  totalReviews: number;
  totalLapses: number;
  futureReviews: AnkiDayCount[];
  intervalBuckets: AnkiBucketCount[];
  easeBuckets: AnkiBucketCount[];
}

export const ankiStudyApi = {
  getQueue: async (deckId: number): Promise<AnkiStudyQueue> => {
    const res = await axiosInstance.get<AnkiStudyQueue>(`/anki/study/${deckId}`);
    return res.data;
  },

  review: async (req: AnkiReviewRequest): Promise<AnkiStudyCard> => {
    const res = await axiosInstance.post<AnkiStudyCard>("/anki/study/review", req);
    return res.data;
  },

  getStats: async (deckId: number): Promise<AnkiStatsDTO> => {
    const res = await axiosInstance.get<AnkiStatsDTO>(`/anki/study/${deckId}/stats`);
    return res.data;
  },
};
