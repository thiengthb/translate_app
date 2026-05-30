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
  totalDue: number;
}

export type AnkiRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface AnkiReviewRequest {
  deckId: number;
  flashcardId: number;
  rating: AnkiRating;
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
};
