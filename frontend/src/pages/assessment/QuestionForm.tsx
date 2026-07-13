import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuestionTagDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { QuestionDraftEditor } from "./QuestionDraftEditor";
import {
  buildQuestionPayload,
  createEmptyDraft,
  draftFromQuestion,
  draftHasContent,
  isDraftValid,
  validateQuestionDraft,
  type QuestionDraft,
} from "./questionDraft";

/**
 * Self-managing create/edit form for a single question-bank entry. Holds one
 * draft internally and saves it on demand — used by the edit page, the quiz
 * wizard sheet, and the question picker modal. (The multi-draft create page
 * uses QuestionDraftEditor directly instead.)
 */
export function QuestionForm({
  question, onSaved, onCancel, ownerQuizId,
}: {
  question?: QuestionBankDTO | null;
  onSaved: (q: QuestionBankDTO) => void;
  onCancel: () => void;
  /** When creating from the quiz wizard, makes the new question private to this quiz. */
  ownerQuizId?: number | null;
}) {
  const [saving, setSaving] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [allTags, setAllTags] = useState<QuestionTagDTO[]>([]);
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    question ? draftFromQuestion(question) : createEmptyDraft(),
  );

  useEffect(() => {
    assessmentApi.fetchQuestionTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  // Reload the draft whenever the edited question changes (or resets to blank).
  useEffect(() => {
    setDraft(question ? draftFromQuestion(question) : createEmptyDraft());
  }, [question]);

  const canSave = isDraftValid(draft);
  const hasContent = draftHasContent(draft);

  const handleSave = async () => {
    const errors = validateQuestionDraft(draft);
    if (errors.length) { toast.error(errors[0].message); return; }
    setSaving(true);
    try {
      const payload = buildQuestionPayload(draft, question ? undefined : ownerQuizId);
      const saved = question
        ? await assessmentApi.updateQuestion(question.id, payload)
        : await assessmentApi.createQuestion(payload);
      toast.success("Question saved.");
      onSaved(saved);
    } catch {
      toast.error("Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const requestCancel = () => {
    if (hasContent) setConfirmCancelOpen(true);
    else onCancel();
  };

  return (
    <div className="space-y-4">
      <QuestionDraftEditor
        draft={draft}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        allTags={allTags}
      />

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={requestCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !canSave}>
          {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}Save question
        </Button>
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        tone="warning"
        title="Discard this question?"
        description="Your changes to this question haven't been saved and will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => { setConfirmCancelOpen(false); onCancel(); }}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
}
