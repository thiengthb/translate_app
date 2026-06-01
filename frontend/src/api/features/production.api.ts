import axiosInstance from "../axios";

export interface ExerciseResponse {
  promptId: number;
  subUseId: number;
  subUseName: string;
  jlptLevel: string;
  l1Prompt: string;
}

export interface AttemptResult {
  attemptId: number;
  finalVerdict: "PASS" | "PARTIAL" | "FAIL";
  detectorPassed: boolean;
  judgeScore: number | null;
  feedback: string;
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
};
