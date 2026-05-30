import axiosInstance from "@/api/axios";
import type {
  QuestionBankDTO,
  QuestionOptionDTO,
  QuestionQueryParams,
  QuizAttemptDTO,
  QuizCategoryDTO,
  QuizDTO,
  QuizQueryParams,
  QuizQuestionDTO,
  StartAttemptRequest,
  SubmitAnswerRequest,
  UserQuizProgressDTO,
} from "@/types";

type Page<T> = { content?: T[]; items?: T[] };
const list = <T>(data: Page<T>): T[] => data.content ?? data.items ?? [];

/* ─────────────────────────────────────────
   Quiz categories
───────────────────────────────────────── */
const fetchCategories = async (): Promise<QuizCategoryDTO[]> => {
  const res = await axiosInstance.get<Page<QuizCategoryDTO>>("/quiz-categories", {
    params: { page: 0, size: 200, sort: "orderIndex,asc" },
  });
  return list(res.data);
};

const fetchCategoryTree = async (): Promise<QuizCategoryDTO[]> => {
  const res = await axiosInstance.get<QuizCategoryDTO[]>("/quiz-categories/tree");
  return res.data;
};

const createCategory = async (data: Partial<QuizCategoryDTO>): Promise<QuizCategoryDTO> => {
  const res = await axiosInstance.post<QuizCategoryDTO>("/quiz-categories", { isActive: true, ...data });
  return res.data;
};

const updateCategory = async (id: number, data: Partial<QuizCategoryDTO>): Promise<QuizCategoryDTO> => {
  const res = await axiosInstance.put<QuizCategoryDTO>(`/quiz-categories/${id}`, data);
  return res.data;
};

const deleteCategory = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/quiz-categories/${id}`);
};

/* ─────────────────────────────────────────
   Quizzes
───────────────────────────────────────── */
const fetchQuizzes = async (params: QuizQueryParams = {}): Promise<QuizDTO[]> => {
  const res = await axiosInstance.get<Page<QuizDTO>>("/quizzes", {
    params: { page: 0, size: 100, sort: "createdAt,desc", ...params },
  });
  return list(res.data);
};

const fetchPublicQuizzes = async (params: QuizQueryParams = {}): Promise<QuizDTO[]> => {
  const res = await axiosInstance.get<Page<QuizDTO>>("/quizzes", {
    params: { page: 0, size: 100, sort: "publishedAt,desc", visibility: "PUBLIC", status: "PUBLISHED", ...params },
  });
  return list(res.data);
};

const fetchQuizById = async (id: number): Promise<QuizDTO> => {
  const res = await axiosInstance.get<QuizDTO>(`/quizzes/${id}`);
  return res.data;
};

const createQuiz = async (data: Partial<QuizDTO>): Promise<QuizDTO> => {
  const res = await axiosInstance.post<QuizDTO>("/quizzes", { isActive: true, status: "DRAFT", ...data });
  return res.data;
};

const updateQuiz = async (id: number, data: Partial<QuizDTO>): Promise<QuizDTO> => {
  const res = await axiosInstance.put<QuizDTO>(`/quizzes/${id}`, data);
  return res.data;
};

const deleteQuiz = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/quizzes/${id}`);
};

const publishQuiz = async (id: number): Promise<QuizDTO> => {
  const res = await axiosInstance.put<QuizDTO>(`/quizzes/${id}/publish`);
  return res.data;
};

const archiveQuiz = async (id: number): Promise<QuizDTO> => {
  const res = await axiosInstance.put<QuizDTO>(`/quizzes/${id}/archive`);
  return res.data;
};

const duplicateQuiz = async (id: number): Promise<QuizDTO> => {
  const res = await axiosInstance.post<QuizDTO>(`/quizzes/${id}/duplicate`);
  return res.data;
};

const fetchQuizQuestions = async (quizId: number): Promise<QuizQuestionDTO[]> => {
  const res = await axiosInstance.get<QuizQuestionDTO[]>(`/quizzes/${quizId}/questions`);
  return res.data;
};

/* ── Quiz ↔ Question placement (quiz-questions CRUD) ── */
const addQuizQuestion = async (data: {
  quizId: number;
  questionId: number;
  orderIndex?: number;
  score?: number;
  isRequired?: boolean;
}): Promise<QuizQuestionDTO> => {
  const res = await axiosInstance.post<QuizQuestionDTO>("/quiz-questions", { isActive: true, ...data });
  return res.data;
};

const removeQuizQuestion = async (quizQuestionId: number): Promise<void> => {
  await axiosInstance.delete(`/quiz-questions/${quizQuestionId}`);
};

/* ─────────────────────────────────────────
   Question bank
───────────────────────────────────────── */
const fetchQuestions = async (params: QuestionQueryParams = {}): Promise<QuestionBankDTO[]> => {
  const res = await axiosInstance.get<Page<QuestionBankDTO>>("/questions", {
    params: { page: 0, size: 100, sort: "createdAt,desc", ...params },
  });
  return list(res.data);
};

const fetchQuestionById = async (id: number): Promise<QuestionBankDTO> => {
  const res = await axiosInstance.get<QuestionBankDTO>(`/questions/${id}`);
  return res.data;
};

const createQuestion = async (data: Partial<QuestionBankDTO>): Promise<QuestionBankDTO> => {
  const res = await axiosInstance.post<QuestionBankDTO>("/questions", { isActive: true, ...data });
  return res.data;
};

const updateQuestion = async (id: number, data: Partial<QuestionBankDTO>): Promise<QuestionBankDTO> => {
  const res = await axiosInstance.put<QuestionBankDTO>(`/questions/${id}`, data);
  return res.data;
};

const deleteQuestion = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/questions/${id}`);
};

const addOption = async (questionId: number, data: Partial<QuestionOptionDTO>): Promise<QuestionOptionDTO> => {
  const res = await axiosInstance.post<QuestionOptionDTO>(`/questions/${questionId}/options`, { isActive: true, ...data });
  return res.data;
};

const removeOption = async (questionId: number, optionId: number): Promise<void> => {
  await axiosInstance.delete(`/questions/${questionId}/options/${optionId}`);
};

const reorderOptions = async (questionId: number, orderedIds: number[]): Promise<void> => {
  await axiosInstance.put(`/questions/${questionId}/options/reorder`, orderedIds);
};

/* ─────────────────────────────────────────
   Attempts
───────────────────────────────────────── */
const startAttempt = async (req: StartAttemptRequest): Promise<QuizAttemptDTO> => {
  const res = await axiosInstance.post<QuizAttemptDTO>("/attempts/start", req);
  return res.data;
};

const submitAnswer = async (attemptId: number, req: SubmitAnswerRequest): Promise<QuizAttemptDTO> => {
  const res = await axiosInstance.post<QuizAttemptDTO>(`/attempts/${attemptId}/answer`, req);
  return res.data;
};

const submitAttempt = async (attemptId: number): Promise<QuizAttemptDTO> => {
  const res = await axiosInstance.post<QuizAttemptDTO>(`/attempts/${attemptId}/submit`);
  return res.data;
};

const getAttempt = async (attemptId: number): Promise<QuizAttemptDTO> => {
  const res = await axiosInstance.get<QuizAttemptDTO>(`/attempts/${attemptId}`);
  return res.data;
};

const getMyAttempts = async (quizId: number): Promise<QuizAttemptDTO[]> => {
  const res = await axiosInstance.get<QuizAttemptDTO[]>("/attempts/my", { params: { quizId } });
  return res.data;
};

/* ─────────────────────────────────────────
   Progress
───────────────────────────────────────── */
const getQuizProgress = async (userId: number, quizId: number): Promise<UserQuizProgressDTO | null> => {
  // 204 No Content → no progress yet (axios returns "" body)
  const res = await axiosInstance.get<UserQuizProgressDTO | "">("/user-quiz-progress/lookup", {
    params: { userId, quizId },
  });
  return res.data && typeof res.data === "object" ? res.data : null;
};

export const assessmentApi = {
  fetchCategories,
  fetchCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchQuizzes,
  fetchPublicQuizzes,
  fetchQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  archiveQuiz,
  duplicateQuiz,
  fetchQuizQuestions,
  addQuizQuestion,
  removeQuizQuestion,
  fetchQuestions,
  fetchQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  addOption,
  removeOption,
  reorderOptions,
  startAttempt,
  submitAnswer,
  submitAttempt,
  getAttempt,
  getMyAttempts,
  getQuizProgress,
};
