import type { QuestionBankDTO, QuestionType } from "@/types";

/* ─────────────────────────────────────────
   Shared client-side model for authoring a question.

   A "draft" is one in-progress question held entirely in the browser. The
   single-question form (QuestionForm) and the multi-draft workspace both edit
   drafts through these helpers, so validation and payload-building stay in one
   place.
───────────────────────────────────────── */

export interface OptionDraft {
  uid: string;
  content: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuestionDraft {
  /** Client-side temp id (never sent to the server). */
  id: string;
  questionType: QuestionType;
  prompt: string;
  promptAudioUrl: string;
  promptImageUrl: string;
  explanation: string;
  hint: string;
  /** "" = none. */
  difficulty: string;
  options: OptionDraft[];
  /** FILL_BLANK accepted answers (case-insensitive at grade time). */
  acceptedAnswers: string[];
  tagIds: number[];
}

// Only these four types can be authored for now.
export const ACTIVE_QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK",
];
// FILL_BLANK uses a dedicated "accepted answers" input instead of options.
export const NO_OPTION_TYPES: QuestionType[] = ["FILL_BLANK"];

// Friendly labels for the type dropdown.
export const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the Blank",
};

export const makeOption = (): OptionDraft => ({
  uid: crypto.randomUUID(), content: "", isCorrect: false, explanation: "",
});

// Two blank options with the first pre-marked correct, so a choice question
// always starts with an answer selected.
export const defaultChoiceOptions = (): OptionDraft[] => {
  const first = makeOption();
  first.isCorrect = true;
  return [first, makeOption()];
};

export const trueFalseOptions = (): OptionDraft[] => [
  { uid: "true", content: "True", isCorrect: true, explanation: "" },
  { uid: "false", content: "False", isCorrect: false, explanation: "" },
];

export const isTrueFalseShape = (opts: OptionDraft[]): boolean =>
  opts.length === 2 && opts[0].content === "True" && opts[1].content === "False";

/** Fresh, empty draft for a brand-new question. */
export const createEmptyDraft = (): QuestionDraft => ({
  id: crypto.randomUUID(),
  questionType: "SINGLE_CHOICE",
  prompt: "",
  promptAudioUrl: "",
  promptImageUrl: "",
  explanation: "",
  hint: "",
  difficulty: "",
  options: defaultChoiceOptions(),
  acceptedAnswers: [""],
  tagIds: [],
});

/** Seed a draft from an existing question (edit flow). */
export const draftFromQuestion = (q: QuestionBankDTO): QuestionDraft => {
  const isFill = q.questionType === "FILL_BLANK";
  const acc = (q.options ?? []).filter((o) => o.isCorrect).map((o) => o.content);
  return {
    id: crypto.randomUUID(),
    questionType: q.questionType,
    prompt: q.prompt,
    promptAudioUrl: q.promptAudioUrl ?? "",
    promptImageUrl: q.promptImageUrl ?? "",
    explanation: q.explanation ?? "",
    hint: q.hint ?? "",
    difficulty: q.difficultyLevel ?? "",
    options: isFill
      ? []
      : (q.options ?? []).map((o) => ({
          uid: crypto.randomUUID(),
          content: o.content,
          isCorrect: o.isCorrect,
          explanation: o.explanation ?? "",
        })),
    acceptedAnswers: isFill ? (acc.length ? acc : [""]) : [""],
    tagIds: (q.tags ?? []).map((t) => t.id),
  };
};

/** Recompute a draft's options when its type changes (keeps sensible defaults). */
export const optionsForType = (next: QuestionType, prev: OptionDraft[]): OptionDraft[] => {
  if (next === "TRUE_FALSE") return trueFalseOptions();
  if (next === "FILL_BLANK") return [];
  // SINGLE_CHOICE / MULTIPLE_CHOICE — keep current options unless they're the
  // fixed True/False pair. Single choice collapses to exactly one correct.
  let base = prev.length && !isTrueFalseShape(prev) ? prev : defaultChoiceOptions();
  if (next === "SINGLE_CHOICE") {
    const idx = base.findIndex((o) => o.isCorrect);
    const keep = idx >= 0 ? idx : 0;
    base = base.map((o, i) => ({ ...o, isCorrect: i === keep }));
  }
  return base;
};

/** Field-level identifiers used by validation + inline error display. */
export type DraftField = "prompt" | "options" | "acceptedAnswers";

export interface DraftFieldError {
  field: DraftField;
  message: string;
}

/**
 * Validate a single draft. Returns one entry per problem (empty = valid).
 * Mirrors the original QuestionForm rules: content required; choice types need
 * ≥2 filled options and ≥1 correct; FILL_BLANK needs ≥1 accepted answer.
 */
export const validateQuestionDraft = (d: QuestionDraft): DraftFieldError[] => {
  const errors: DraftFieldError[] = [];
  if (!d.prompt.trim()) errors.push({ field: "prompt", message: "Content is required." });

  if (d.questionType === "FILL_BLANK") {
    const answers = d.acceptedAnswers.map((a) => a.trim()).filter(Boolean);
    if (answers.length === 0) {
      errors.push({ field: "acceptedAnswers", message: "Add at least one accepted answer." });
    }
  } else {
    const filled = d.options.filter((o) => o.content.trim());
    if (filled.length < 2) {
      errors.push({ field: "options", message: "Add at least 2 options." });
    } else if (!filled.some((o) => o.isCorrect)) {
      errors.push({ field: "options", message: "Mark at least one correct option." });
    }
  }
  return errors;
};

export const isDraftValid = (d: QuestionDraft): boolean => validateQuestionDraft(d).length === 0;

/** True if the draft holds any authored content (used by leave guards). */
export const draftHasContent = (d: QuestionDraft): boolean =>
  d.prompt.trim() !== "" ||
  d.explanation.trim() !== "" ||
  d.hint.trim() !== "" ||
  d.promptAudioUrl.trim() !== "" ||
  d.promptImageUrl.trim() !== "" ||
  d.options.some((o) => o.content.trim() !== "") ||
  d.acceptedAnswers.some((a) => a.trim() !== "") ||
  d.tagIds.length > 0;

/** Build the API payload from a draft (assumes it has already been validated). */
export const buildQuestionPayload = (
  d: QuestionDraft,
  ownerQuizId?: number | null,
): Partial<QuestionBankDTO> => {
  let options: NonNullable<QuestionBankDTO["options"]>;
  if (d.questionType === "FILL_BLANK") {
    const answers = d.acceptedAnswers.map((a) => a.trim()).filter(Boolean);
    options = answers.map((a, i) => ({
      id: 0, questionId: 0, isActive: true,
      content: a,
      contentAudioUrl: null, contentImageUrl: null,
      isCorrect: true, explanation: null, orderIndex: i,
    }));
  } else {
    options = d.options
      .filter((o) => o.content.trim())
      .map((o, i) => ({
        id: 0, questionId: 0, isActive: true,
        content: o.content.trim(),
        contentAudioUrl: null, contentImageUrl: null,
        isCorrect: o.isCorrect, explanation: o.explanation.trim() || null, orderIndex: i,
      }));
  }

  const payload: Partial<QuestionBankDTO> = {
    isActive: true,
    questionType: d.questionType,
    prompt: d.prompt.trim(),
    promptAudioUrl: d.promptAudioUrl.trim() || null,
    promptImageUrl: d.promptImageUrl.trim() || null,
    explanation: d.explanation.trim() || null,
    hint: d.hint.trim() || null,
    difficultyLevel: (d.difficulty || null) as QuestionBankDTO["difficultyLevel"],
    defaultScore: 1,
    tagIds: d.tagIds,
    options,
  };
  return ownerQuizId != null ? { ...payload, ownerQuizId } : payload;
};
