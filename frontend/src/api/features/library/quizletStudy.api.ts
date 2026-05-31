import axiosInstance from "@/api/axios";

/** The six study modes a deck can be studied in. SRS is the only one that
 *  touches spaced-repetition scheduling; the rest persist here (or nowhere). */
export type StudyMode = "FLASHCARD" | "LEARN" | "MATCH" | "WRITE" | "QUIZ" | "SRS";

/** Non-SRS modes that report graded answers / sessions to the backend. */
export type QuizletMode = Exclude<StudyMode, "SRS">;

export interface QuizletProgressDTO {
  id: number;
  flashcardId: number;
  deckItemId: number;
  status: "NOT_STUDIED" | "STUDYING" | "MASTERED";
  correctCount: number;
  wrongCount: number;
  lastAnswerCorrect?: boolean;
  lastStudiedAt?: string;
}

export interface QuizletAnswerRequest {
  deckId: number;
  flashcardId: number;
  mode: QuizletMode;
  correct: boolean;
}

export interface QuizletSessionRequest {
  deckId: number;
  mode: QuizletMode;
  totalItems: number;
  completedItems: number;
  startedAt?: string;
  endedAt?: string;
}

/**
 * Study API for the non-SRS modes. Every call here lands only in the Quizlet
 * progress tables — it never affects SRS due dates / intervals / ease.
 */
export const quizletStudyApi = {
  getProgress: async (deckId: number): Promise<QuizletProgressDTO[]> => {
    const res = await axiosInstance.get<QuizletProgressDTO[]>(`/quizlet/study/${deckId}/progress`);
    return res.data;
  },

  answer: async (req: QuizletAnswerRequest): Promise<QuizletProgressDTO> => {
    const res = await axiosInstance.post<QuizletProgressDTO>("/quizlet/study/answer", req);
    return res.data;
  },

  logSession: async (req: QuizletSessionRequest): Promise<void> => {
    await axiosInstance.post("/quizlet/study/session", req);
  },
};
