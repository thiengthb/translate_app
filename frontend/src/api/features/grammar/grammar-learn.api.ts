import axiosInstance from "@/api/axios";

// ── Dashboard ──
export interface LevelSummary {
  level: string;
  total: number;
  unlocked: number;
  learning: number;
  reviewDue: number;
  mastered: number;
}

export interface GrammarItem {
  subUseId: number;
  name: string;
  state: string | null;
  memoryScore: number | null;
  nextReviewAt: string | null;
}

export interface LevelDetail {
  level: string;
  total: number;
  unlocked: number;
  mastered: GrammarItem[];
  learning: GrammarItem[];
  locked: GrammarItem[];
}

export interface GrammarDetail {
  subUseId: number;
  name: string;
  jlptLevel: string | null;
  state: string;
  intervalDays: number | null;
  reviewCount: number | null;
  lapses: number | null;
  memoryScore: number | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  nuanceDescription: string | null;
  structurePattern: string | null;
  exampleJp: string | null;
  exampleVi: string | null;
}

// ── Session ──
export interface SessionItem {
  subUseId: number;
  name: string;
  jlptLevel: string | null;
  kind: "REVIEW" | "NEW";
  state: string | null;
  intervalDays: number | null;
  reviewCount: number | null;
  nextReviewAt: string | null;
}

export interface SessionResponse {
  items: SessionItem[];
  reviewCount: number;
  newCount: number;
  totalDue: number;
  totalNewAvailable: number;
}

// ── Review (grade + schedule) ──
export interface ReviewResponse {
  attemptId: number;
  finalVerdict: "PASS" | "PARTIAL" | "FAIL";
  detectorPassed: boolean;
  judgeScore: number | null;
  feedback: string;
  correction: string | null;
  referenceAnswer: string;
  subUseId: number;
  ratingApplied: "AGAIN" | "HARD" | "GOOD" | "EASY";
  state: string;
  intervalDays: number;
  reviewCount: number;
  lapses: number;
  memoryScore: number;
  nextReviewAt: string | null;
  againPreview: string;
  hardPreview: string;
  goodPreview: string;
  easyPreview: string;
}

// ── Cloze (fill-in-the-blank) ──
export interface ClozeQuestion {
  referenceSentenceId: number | null;
  subUseId: number;
  subUseName: string | null;
  jlptLevel: string | null;
  l1Text: string | null;
  masked: string | null;
  blankLength: number;
  hasCloze: boolean;
}

export interface ClozeResult {
  status: "CORRECT" | "WARN" | "WRONG";
  message: string;
  canRetry: boolean;
  correctAnswer: string | null;
  fullSentence: string | null;
  ratingApplied: "GOOD" | "AGAIN" | null;
  state: string | null;
  intervalDays: number | null;
  nextReviewAt: string | null;
  goodPreview: string | null;
  againPreview: string | null;
}

// ── Daily goal ──
export interface GoalSnapshot {
  newPerDay: number;
  reviewsPerDay: number;
  newDoneToday: number;
  reviewsDoneToday: number;
  newRemaining: number;
  reviewsRemaining: number;
}

export const grammarLearnApi = {
  dashboard: async (): Promise<LevelSummary[]> => {
    const res = await axiosInstance.get<LevelSummary[]>("/grammar/learn/dashboard");
    return res.data;
  },

  level: async (level: string): Promise<LevelDetail> => {
    const res = await axiosInstance.get<LevelDetail>(`/grammar/learn/levels/${level}`);
    return res.data;
  },

  detail: async (subUseId: number): Promise<GrammarDetail> => {
    const res = await axiosInstance.get<GrammarDetail>(`/grammar/learn/detail/${subUseId}`);
    return res.data;
  },

  session: async (level?: string, extra = false): Promise<SessionResponse> => {
    const res = await axiosInstance.get<SessionResponse>("/grammar/session", {
      params: { ...(level ? { level } : {}), ...(extra ? { extra: true } : {}) },
    });
    return res.data;
  },

  getGoal: async (): Promise<GoalSnapshot> => {
    const res = await axiosInstance.get<GoalSnapshot>("/grammar/learn/goal");
    return res.data;
  },

  updateGoal: async (newPerDay: number, reviewsPerDay: number): Promise<GoalSnapshot> => {
    const res = await axiosInstance.put<GoalSnapshot>("/grammar/learn/goal", {
      newPerDay,
      reviewsPerDay,
    });
    return res.data;
  },

  review: async (promptId: number, answer: string): Promise<ReviewResponse> => {
    const res = await axiosInstance.post<ReviewResponse>("/grammar/review", { promptId, answer });
    return res.data;
  },

  cloze: async (subUseId: number): Promise<ClozeQuestion> => {
    const res = await axiosInstance.get<ClozeQuestion>(`/grammar/cloze/${subUseId}`);
    return res.data;
  },

  clozeReview: async (
    referenceSentenceId: number,
    answer: string,
    attemptNo: number,
  ): Promise<ClozeResult> => {
    const res = await axiosInstance.post<ClozeResult>("/grammar/cloze/review", {
      referenceSentenceId,
      answer,
      attemptNo,
    });
    return res.data;
  },
};
