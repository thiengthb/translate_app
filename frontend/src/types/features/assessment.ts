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

export interface QuizDTO {
  id: number;
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

/** A reusable label for filtering / grouping questions. */
export interface QuestionTagDTO {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  /** Owner user id; null = system tag. */
  createdByUser: number | null;
  isActive?: boolean;
}

export interface QuestionBankDTO {
  id: number;
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
  /** When set, the question is private to this quiz (hidden from the shared bank). */
  ownerQuizId?: number | null;
  /** Optimistic-lock version (BaseDTO). */
  version: number;
  /** Content version — bumped only when the question's content changes. */
  contentVersion?: number;
  options: QuestionOptionDTO[];
  /** Tags attached to the question (read-only view from the API). */
  tags?: QuestionTagDTO[];
  /** Tag ids to attach on create/update (write-only). */
  tagIds?: number[];
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

/** Option as shown during an attempt — deliberately WITHOUT `isCorrect`
 *  (the answer key lives in `correctAnswerSnapshot`, revealed only after submit). */
export interface AttemptOptionSnapshot {
  id: number;
  questionId?: number;
  content: string;
  contentAudioUrl?: string | null;
  contentImageUrl?: string | null;
  orderIndex?: number;
}

/**
 * Frozen answer key for an attempt question. Shape depends on question type:
 * - SINGLE_CHOICE / TRUE_FALSE / LISTENING → `{ correctOptionId }`
 * - MULTIPLE_CHOICE / ORDERING / MATCHING → `{ correctOptionIds }`
 * - FILL_BLANK → `{ acceptedAnswers }`
 * Only present once the attempt is submitted / reveal is allowed.
 */
export interface CorrectAnswerSnapshot {
  correctOptionId?: number | null;
  correctOptionIds?: number[];
  acceptedAnswers?: string[];
}

export interface QuizAttemptQuestionDTO {
  id: number;
  questionType: QuestionType;
  originalQuestionVersion?: number | null;
  questionSnapshot: Record<string, unknown>;
  optionsSnapshot: AttemptOptionSnapshot[] | null;
  /** Answer key — only populated after submit / when reveal is allowed. */
  correctAnswerSnapshot?: CorrectAnswerSnapshot | null;
  orderIndex: number;
  score: number;
  isAnswered: boolean;
  isCorrect: boolean | null;
  earnedScore: number;
  answeredAt: string | null;
  /** User's own answer — only populated after submit / reveal. */
  userAnswerSnapshot?: Record<string, unknown> | null;
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
  levelId?: number;
  creatorId?: number;
  status?: QuizStatus;
  visibility?: QuizVisibility;
  difficultyLevel?: DifficultyLevel;
  search?: string;
}

export interface QuestionQueryParams {
  levelId?: number;
  questionType?: QuestionType;
  difficultyLevel?: DifficultyLevel;
  /** Filter to questions carrying this single tag. */
  tagId?: number;
  search?: string;
  /**
   * Quiz wizard scope: include shared bank questions PLUS this quiz's private
   * (quick-created) ones. Omitted everywhere else, so the shared bank hides
   * quiz-private questions.
   */
  ownerQuizId?: number;
}

export interface QuestionTagQueryParams {
  name?: string;
  code?: string;
  search?: string;
}
