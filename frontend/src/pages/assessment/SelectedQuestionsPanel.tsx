import { useState } from "react";
import type { QuestionBankDTO, QuizQuestionDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, ListChecks, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { QuestionForm } from "./QuestionForm";
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
}: {
  /** quiz_question rows for this quiz, each with its `question` populated. */
  placements: QuizQuestionDTO[];
  /** The quiz being edited — newly-created questions become private to it. */
  quizId?: number | null;
  /** Remove a placement (by quiz_question id). */
  onRemove: (quizQuestionId: number) => void | Promise<void>;
  /** A new question was created — add it to the quiz (by question id). */
  onAddCreated: (questionId: number) => void | Promise<void>;
}) {
  const [formOpen, setFormOpen] = useState(false);

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
            <SelectedRow key={p.id} index={i} placement={p} onRemove={() => onRemove(p.id)} />
          ))}
        </div>
      )}

      {/* Create a new (quiz-private) question */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>New question</DialogTitle>
            <DialogDescription>Create a question — it's added to this quiz only.</DialogDescription>
          </DialogHeader>
          <ScrollHintContainer viewportClassName="px-1 py-1">
            <QuestionForm
              ownerQuizId={quizId}
              onCancel={() => setFormOpen(false)}
              onSaved={(created) => {
                setFormOpen(false);
                void onAddCreated(created.id);
              }}
            />
          </ScrollHintContainer>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── One selected question row (expandable preview) ── */
function SelectedRow({
  index,
  placement: p,
  onRemove,
}: {
  index: number;
  placement: QuizQuestionDTO;
  onRemove: () => void;
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

        {/* Remove */}
        <button
          type="button"
          title="Remove from quiz"
          onClick={onRemove}
          className="shrink-0 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
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
