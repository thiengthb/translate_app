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

/** An AI-generated prompt awaiting teacher review. */
export interface PendingPrompt {
  promptId: number;
  subUseId: number;
  subUseName: string;
  jlptLevel: string | null;
  situation: string;
  referenceAnswer: string;
  register: string | null;
  createdAt: string;
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

  // ── Teacher review queue (requires SCENARIO_STUB_UPDATE) ──

  /** Generated prompts awaiting review (newest first). */
  listPending: async (): Promise<PendingPrompt[]> => {
    const res = await axiosInstance.get<PendingPrompt[]>("/production/prompts/pending");
    return res.data;
  },

  /** Approve a generated prompt into the shared pool. */
  approvePrompt: async (promptId: number): Promise<void> => {
    await axiosInstance.post(`/production/prompts/${promptId}/approve`);
  },

  /** Reject a generated prompt (keeps it out of the shared pool). */
  rejectPrompt: async (promptId: number): Promise<void> => {
    await axiosInstance.post(`/production/prompts/${promptId}/reject`);
  },
};
