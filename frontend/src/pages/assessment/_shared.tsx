import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttemptStatus, CorrectAnswerSnapshot, DifficultyLevel, QuizStatus } from "@/types";

export function DifficultyBadge({ level }: { level: DifficultyLevel | null | undefined }) {
  if (!level) return null;
  const tone: Record<string, string> = {
    EASY: "bg-green-500/15 text-green-600",
    MEDIUM: "bg-amber-500/15 text-amber-600",
    HARD: "bg-red-500/15 text-red-600",
    N5: "bg-sky-500/15 text-sky-600",
    N4: "bg-cyan-500/15 text-cyan-600",
    N3: "bg-violet-500/15 text-violet-600",
    N2: "bg-orange-500/15 text-orange-600",
    N1: "bg-rose-500/15 text-rose-600",
  };
  return <Badge variant="outline" className={cn("border-0", tone[level])}>{level}</Badge>;
}

export function QuizStatusBadge({ status }: { status: QuizStatus }) {
  const tone: Record<QuizStatus, string> = {
    DRAFT: "bg-slate-500/15 text-slate-600",
    PUBLISHED: "bg-green-500/15 text-green-600",
    ARCHIVED: "bg-zinc-500/15 text-zinc-500",
  };
  return <Badge variant="outline" className={cn("border-0", tone[status])}>{status}</Badge>;
}

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const tone: Record<AttemptStatus, string> = {
    IN_PROGRESS: "bg-amber-500/15 text-amber-600",
    SUBMITTED: "bg-green-500/15 text-green-600",
    EXPIRED: "bg-red-500/15 text-red-600",
    CANCELLED: "bg-zinc-500/15 text-zinc-500",
  };
  return <Badge variant="outline" className={cn("border-0", tone[status])}>{status.replace("_", " ")}</Badge>;
}

export function formatSeconds(total: number | null | undefined): string {
  if (total == null) return "—";
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

/* ─────────────────────────────────────────
   Answer-key helpers — the attempt's options no longer carry `isCorrect`.
   The correct answer lives in `correctAnswerSnapshot`, revealed only after
   submit. These read it back regardless of question type.
───────────────────────────────────────── */

/** Whether a given option id is part of the correct answer key. */
export function isCorrectOption(
  correct: CorrectAnswerSnapshot | null | undefined,
  optionId: number
): boolean {
  if (!correct) return false;
  if (correct.correctOptionId != null && correct.correctOptionId === optionId) return true;
  if (Array.isArray(correct.correctOptionIds) && correct.correctOptionIds.includes(optionId)) return true;
  return false;
}

/** Accepted free-text answers (FILL_BLANK), if any. */
export function acceptedAnswers(correct: CorrectAnswerSnapshot | null | undefined): string[] {
  return correct?.acceptedAnswers ?? [];
}
