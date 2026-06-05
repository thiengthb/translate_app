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
  /** Coverage drill only: whether the requested target word appears in the answer. */
  targetUsed?: boolean | null;
}

/** A vocabulary word (coverage-drill setup + target). */
export interface VocabWordItem {
  surface: string;
  reading?: string | null;
  gloss?: string | null;
}

export interface AttemptResult {
  attemptId: number;
  finalVerdict: "PASS" | "PARTIAL" | "FAIL";
  detectorPassed: boolean;
  /** Holistic score, normalized 0.0-1.0 (display as judgeScore*10 → x/10). */
  judgeScore: number | null;
  feedback: string;
  /** AI rewrite of the learner's own sentence into correct, natural Japanese. */
  correction?: string | null;
  referenceAnswer: string;
}

/** A grammar point the user can select to drill. */
export interface GrammarOption {
  id: number;
  name: string;
  jlptLevel: string | null;
  /** Stable seed key — the value to put in an import item's `detectorKey`. */
  detectorKey: string | null;
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

/** One prompt to bulk-import (produced offline by an external chat AI). */
export interface ImportPromptItem {
  detectorKey: string;
  situation: string;
  l2Reference: string;
  register?: string;
  l1PromptTemplate?: string;
}

/** Outcome of a bulk prompt import. */
export interface ImportPromptsResult {
  imported: number;
  skipped: number;
  unknownKeys: string[];
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

  /**
   * Generate one practice prompt. Pass a {@code subUseId} to drill that grammar point,
   * or omit it for a random AI-composed exercise (the server picks the grammar point).
   * Pass {@code target} (coverage drill) to force the answer to use that exact word.
   */
  generateExercise: async (
    subUseId: number | undefined,
    source: VocabSource,
    target?: VocabWordItem,
  ): Promise<ExerciseResponse> => {
    const res = await axiosInstance.post<ExerciseResponse>("/production/generate", {
      subUseId: subUseId ?? null,
      source,
      target,
    });
    return res.data;
  },

  /** All vocabulary words for a source (drives the coverage-drill word selector). */
  listVocab: async (source: VocabSource): Promise<VocabWordItem[]> => {
    const res = await axiosInstance.get<VocabWordItem[]>("/production/vocab", {
      params: { type: source.type, level: source.level, deckId: source.deckId },
    });
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

  /** Bulk-import externally AI-generated prompts into the review queue. */
  importPrompts: async (items: ImportPromptItem[]): Promise<ImportPromptsResult> => {
    const res = await axiosInstance.post<ImportPromptsResult>("/production/prompts/import", {
      items,
    });
    return res.data;
  },
};
