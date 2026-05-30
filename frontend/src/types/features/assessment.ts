/* ─────────────────────────────────────────
   Assessment / Quiz module types
───────────────────────────────────────── */

export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "WRITING"
  | "MATCHING"
  | "ORDERING"
  | "LISTENING";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "CANCELLED";

export type JudgeMethod = "AUTO_OPTION" | "EXACT_MATCH" | "LLM_JUDGE" | "MANUAL";

export type QuizVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";
export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PASSED"
  | "FAILED";
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "N5" | "N4" | "N3" | "N2" | "N1";

export interface QuizCategoryDTO {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  children?: QuizCategoryDTO[];
}

export interface QuizDTO {
  id: number;
  quizTypeId: number | null;
  categoryId: number | null;
  levelId: number | null;
  creatorId: number | null;
  deckId: number | null;
  code: string | null;
  title: string;
  description: string | null;
  totalQuestions: number;
  totalScore: number;
  passScore: number;
  timeLimitMinutes: number | null;
  difficultyLevel: DifficultyLevel | null;
  isRandomQuestion: boolean;
  isRandomOption: boolean;
  allowRetake: boolean;
  maxAttempts: number | null;
  showAnswerAfterSubmit: boolean;
  showExplanationAfterSubmit: boolean;
  visibility: QuizVisibility;
  status: QuizStatus;
  publishedAt: string | null;
  isActive?: boolean;
}

export interface QuestionOptionDTO {
  id: number;
  questionId: number;
  content: string;
  contentAudioUrl: string | null;
  contentImageUrl: string | null;
  isCorrect: boolean;
  explanation: string | null;
  orderIndex: number;
}

export interface QuestionBankDTO {
  id: number;
  categoryId: number | null;
  levelId: number | null;
  itemType: string | null;
  questionType: QuestionType;
  prompt: string;
  promptAudioUrl: string | null;
  promptImageUrl: string | null;
  explanation: string | null;
  hint: string | null;
  difficultyLevel: DifficultyLevel | null;
  defaultScore: number;
  isActive: boolean;
  version: number;
  options: QuestionOptionDTO[];
}

export interface QuizQuestionDTO {
  id: number;
  quizId: number;
  sectionId: number | null;
  questionId: number;
  question?: QuestionBankDTO;
  orderIndex: number;
  score: number;
  isRequired: boolean;
}

export interface StartAttemptRequest {
  quizId: number;
  assignmentId?: number;
}

export interface SubmitAnswerRequest {
  attemptQuestionId: number;
  selectedOptionId?: number;
  selectedOptionIds?: number[];
  answerText?: string;
  responseTimeMs: number;
}

export interface QuizAttemptQuestionDTO {
  id: number;
  questionType: QuestionType;
  questionSnapshot: Record<string, unknown>;
  optionsSnapshot: QuestionOptionDTO[] | null;
  orderIndex: number;
  score: number;
  isAnswered: boolean;
  isCorrect: boolean | null;
  earnedScore: number;
  answeredAt: string | null;
}

export interface QuizAttemptDTO {
  id: number;
  userId: number;
  quizId: number;
  assignmentId: number | null;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSeconds: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  skippedQuestions: number;
  totalScore: number;
  earnedScore: number;
  percentage: number;
  isPassed: boolean;
  attemptQuestions: QuizAttemptQuestionDTO[];
}

export interface UserQuizProgressDTO {
  id?: number;
  userId: number;
  quizId: number;
  attemptCount: number;
  bestScore: number;
  bestPercentage: number;
  latestScore: number;
  latestPercentage: number;
  status: ProgressStatus;
  passedAt: string | null;
}

/* ── Query param helpers ── */
export interface QuizQueryParams {
  categoryId?: number;
  levelId?: number;
  creatorId?: number;
  status?: QuizStatus;
  visibility?: QuizVisibility;
  difficultyLevel?: DifficultyLevel;
  search?: string;
}

export interface QuestionQueryParams {
  categoryId?: number;
  levelId?: number;
  questionType?: QuestionType;
  difficultyLevel?: DifficultyLevel;
  search?: string;
}
