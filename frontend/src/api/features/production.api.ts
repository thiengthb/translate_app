import axiosInstance from "../axios";

export interface ExerciseResponse {
  promptId: number;
  subUseId: number;
  subUseName: string;
  jlptLevel: string;
  l1Prompt: string;
  /** Vocabulary words seeded into this prompt (present for generated drills). */
  words?: string[];
  /** True when AI-composed; false when it fell back to a seeded exercise. */
  generated?: boolean;
}

export interface AttemptResult {
  attemptId: number;
  finalVerdict: "PASS" | "PARTIAL" | "FAIL";
  detectorPassed: boolean;
  judgeScore: number | null;
  feedback: string;
  referenceAnswer: string;
}

/** A grammar point the user can select to drill. */
export interface GrammarOption {
  id: number;
  name: string;
  jlptLevel: string | null;
}

/** Where the vocabulary for a generated prompt comes from. */
export interface VocabSource {
  type: "LEVEL" | "DECK";
  level?: string;
  deckId?: number;
}

export const productionApi = {
  getExercise: async (subUseId?: number): Promise<ExerciseResponse> => {
    const res = await axiosInstance.get<ExerciseResponse>("/production/exercise", {
      params: subUseId ? { subUseId } : {},
    });
    return res.data;
  },

  submitAttempt: async (promptId: number, answer: string): Promise<AttemptResult> => {
    const res = await axiosInstance.post<AttemptResult>("/production/attempt", { promptId, answer });
    return res.data;
  },

  /** Grammar points available to drill (id, name, JLPT level). */
  listGrammars: async (): Promise<GrammarOption[]> => {
    const res = await axiosInstance.get<GrammarOption[]>("/production/grammars");
    return res.data;
  },

  /** Generate one vocab-driven practice prompt for a selected grammar point. */
  generateExercise: async (subUseId: number, source: VocabSource): Promise<ExerciseResponse> => {
    const res = await axiosInstance.post<ExerciseResponse>("/production/generate", { subUseId, source });
    return res.data;
  },
};
