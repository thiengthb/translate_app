import { useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuizQuestionDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ListChecks, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { QuestionFormSheet } from "./QuestionFormSheet";
import { TagBadges } from "./QuestionTags";
import { QUESTION_TYPE_LABELS, QuestionOptionsPreview } from "./QuestionOptionsPreview";

/**
 * The "Selected" tab of the quiz wizard — a cart-like list of the questions
 * placed in this quiz. You can reorder-free remove a placement, expand to
 * preview a question, or create a brand-new question (private to this quiz)
 * that is added straight to the selection.
 */
export function SelectedQuestionsPanel({
  placements,
  quizId,
  onRemove,
  onAddCreated,
  onChanged,
}: {
  /** quiz_question rows for this quiz, each with its `question` populated. */
  placements: QuizQuestionDTO[];
  /** The quiz being edited — newly-created questions become private to it. */
  quizId?: number | null;
  /** Remove a placement (by quiz_question id). */
  onRemove: (quizQuestionId: number) => void | Promise<void>;
  /** A new question was created — add it to the quiz (by question id). */
  onAddCreated: (questionId: number) => void | Promise<void>;
  /** A selected question changed and the parent should reload placements. */
  onChanged?: () => void | Promise<void>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankDTO | null>(null);
  const [confirmDel, setConfirmDel] = useState<QuizQuestionDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteQuestion = async () => {
    if (!confirmDel?.question) return;
    setDeleting(true);
    try {
      await onRemove(confirmDel.id);
      await assessmentApi.deleteQuestion(confirmDel.question.id);
      toast.success("Question deleted.");
      setConfirmDel(null);
      await onChanged?.();
    } catch {
      toast.error("Failed to delete question.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {placements.length === 0
            ? "No questions added yet."
            : `${placements.length} question${placements.length === 1 ? "" : "s"} in this quiz.`}
        </p>
        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4 mr-1" />New question
        </Button>
      </div>

      {placements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-muted-foreground">
          <ListChecks className="size-8 opacity-40" />
          <p className="text-sm">Pick questions from the bank, or create a new one.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden divide-y divide-border/40">
          {placements.map((p, i) => (
            <SelectedRow
              key={p.id}
              index={i}
              placement={p}
              deleting={deleting && confirmDel?.id === p.id}
              onEdit={() => p.question && setEditingQuestion(p.question)}
              onRemove={() => onRemove(p.id)}
              onDelete={() => setConfirmDel(p)}
            />
          ))}
        </div>
      )}

      {/* Create a new (quiz-private) question */}
      <QuestionFormSheet
        open={formOpen}
        ownerQuizId={quizId}
        onOpenChange={setFormOpen}
        onSaved={(created) => {
          setFormOpen(false);
          void onAddCreated(created.id);
        }}
      />

      <QuestionFormSheet
        open={editingQuestion != null}
        question={editingQuestion}
        ownerQuizId={quizId}
        onOpenChange={(open) => {
          if (!open) setEditingQuestion(null);
        }}
        onSaved={() => {
          setEditingQuestion(null);
          void onChanged?.();
        }}
      />

      <ConfirmDialog
        open={confirmDel != null}
        loading={deleting}
        title="Delete question?"
        description={
          confirmDel?.question
            ? `This permanently deletes "${confirmDel.question.prompt.slice(0, 60)}${confirmDel.question.prompt.length > 60 ? "..." : ""}" and removes it from this quiz.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={deleteQuestion}
        onCancel={() => {
          if (!deleting) setConfirmDel(null);
        }}
      />
    </div>
  );
}

/* ── One selected question row (expandable preview) ── */
function SelectedRow({
  index,
  placement: p,
  deleting,
  onEdit,
  onRemove,
  onDelete,
}: {
  index: number;
  placement: QuizQuestionDTO;
  deleting: boolean;
  onEdit: () => void;
  onRemove: () => void | Promise<void>;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const q = p.question;
  const isPrivate = q?.ownerQuizId != null;

  return (
    <>
      <div className={cn("flex items-center gap-3 px-3 py-2.5", index % 2 === 0 ? "bg-muted/20" : "bg-card")}>
        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Hide options" : "Show options"}
          aria-expanded={open}
          disabled={!q}
          className="shrink-0 flex items-center justify-center size-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
        </button>

        {/* Order number */}
        <span className="shrink-0 w-6 text-center text-xs font-semibold text-muted-foreground tabular-nums">
          {index + 1}
        </span>

        {/* Prompt */}
        <span className="flex-1 min-w-0 text-sm font-medium truncate flex items-center gap-1.5">
          <span className="truncate">{q?.prompt ?? `Question #${p.questionId}`}</span>
          {isPrivate && (
            <Badge variant="outline" className="shrink-0 text-[9px] border-amber-400/50 text-amber-600">
              Quiz only
            </Badge>
          )}
        </span>

        {/* Type */}
        {q && (
          <span className="hidden sm:block shrink-0">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {QUESTION_TYPE_LABELS[q.questionType] ?? q.questionType}
            </Badge>
          </span>
        )}

        {/* Edit / remove / delete */}
        {q && (
          <button
            type="button"
            title="Edit question"
            onClick={onEdit}
            className="shrink-0 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          title="Remove from quiz"
          onClick={onRemove}
          className="shrink-0 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
        {q && (
          <button
            type="button"
            title="Delete question"
            onClick={onDelete}
            disabled={deleting}
            className="shrink-0 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        )}
      </div>

      {open && q && (
        <div className="bg-background px-4 py-3 pl-11">
          {q.tags && q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2"><TagBadges tags={q.tags} /></div>
          )}
          <QuestionOptionsPreview question={q as QuestionBankDTO} />
        </div>
      )}
    </>
  );
}
