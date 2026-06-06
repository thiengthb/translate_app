import { useEffect, useRef, useState } from "react";
import { assessmentApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import type { QuestionBankDTO, QuestionTagDTO, QuestionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Check, ImageIcon, Loader2, Music, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { TagChips } from "./QuestionTags";

/* ── Media input: click to upload a local file OR paste a link ── */
function MediaInput({
  label, value, onChange, type,
}: {
  label: string; value: string; onChange: (v: string) => void; type: "image" | "audio";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // A picked file is uploaded to the file store, which returns a URL we save —
  // exactly like a pasted link. (Same flow as the group cover image.)
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // allow re-picking the same file
    if (!file) return;

    const maxMb = type === "image" ? 5 : 10;
    if (type === "image" && !file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (type === "audio" && !file.type.startsWith("audio/")) { toast.error("Please choose an audio file."); return; }
    if (file.size > maxMb * 1024 * 1024) { toast.error(`File too large (max ${maxMb} MB).`); return; }

    setUploading(true);
    try {
      const uploaded = await fileApi.upload(file, "question", undefined, type === "image" ? "promptImageUrl" : "promptAudioUrl");
      onChange(uploaded.url);
      toast.success(`${type === "image" ? "Image" : "Audio"} uploaded.`);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const showPreview = !!value && (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:"));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1">
        {type === "image" ? <ImageIcon className="size-3.5" /> : <Music className="size-3.5" />}
        {label}
      </Label>
      {/* Single combined control: paste a link in the field, or click the
          embedded icon to upload a file. */}
      <div className="flex items-center rounded-md border border-input bg-transparent pr-1 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste a link, or click → to upload"
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            title="Clear"
            onClick={() => onChange("")}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="button"
          title={`Upload ${type} file`}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {uploading
            ? <Loader2 className="size-4 animate-spin" />
            : type === "image" ? <ImageIcon className="size-4" /> : <Music className="size-4" />}
        </button>
        <input ref={fileRef} type="file" accept={type === "image" ? "image/*" : "audio/*"} className="hidden" onChange={handleFile} />
      </div>
      {/* Preview */}
      {showPreview && type === "image" && (
        <img
          src={value}
          alt="preview"
          className="max-h-40 rounded-md border border-border object-contain bg-muted/30"
        />
      )}
      {showPreview && type === "audio" && (
        <audio controls src={value} className="w-full h-9" />
      )}
    </div>
  );
}

// Only these four types can be created for now.
const ACTIVE_QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK",
];
// Future types (hidden until implemented):
// "WRITING", "MATCHING", "ORDERING", "LISTENING"

// FILL_BLANK uses a dedicated "accepted answers" input instead of options.
const NO_OPTION_TYPES: QuestionType[] = ["FILL_BLANK"];

// Friendly labels for the type dropdown (and badges elsewhere).
const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the Blank",
};

interface OptionDraft {
  uid: string;
  content: string;
  isCorrect: boolean;
  explanation: string;
}

const makeOption = (): OptionDraft => ({ uid: crypto.randomUUID(), content: "", isCorrect: false, explanation: "" });

// Two blank options with the first pre-marked correct, so a choice question
// always starts with an answer selected (a question must always have one).
const defaultChoiceOptions = (): OptionDraft[] => {
  const first = makeOption();
  first.isCorrect = true;
  return [first, makeOption()];
};

const trueFalseOptions = (): OptionDraft[] => [
  { uid: "true", content: "True", isCorrect: true, explanation: "" },
  { uid: "false", content: "False", isCorrect: false, explanation: "" },
];

const isTrueFalseShape = (opts: OptionDraft[]): boolean =>
  opts.length === 2 && opts[0].content === "True" && opts[1].content === "False";

/**
 * Presentational create/edit form for a question-bank entry.
 * Rendered full-page by QuestionFormPage and inline inside QuestionPickerModal.
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
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [promptAudioUrl, setPromptAudioUrl] = useState("");
  const [promptImageUrl, setPromptImageUrl] = useState("");
  const [explanation, setExplanation] = useState("");
  const [hint, setHint] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>(defaultChoiceOptions());
  // FILL_BLANK: list of accepted answers (each compared case-insensitively).
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>([""]);

  /* ── Tags ── */
  const [allTags, setAllTags] = useState<QuestionTagDTO[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    assessmentApi.fetchQuestionTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    if (question) {
      setQuestionType(question.questionType);
      setPrompt(question.prompt);
      setPromptAudioUrl(question.promptAudioUrl ?? "");
      setPromptImageUrl(question.promptImageUrl ?? "");
      setExplanation(question.explanation ?? "");
      setHint(question.hint ?? "");
      setDifficulty(question.difficultyLevel ?? "");
      setSelectedTagIds(new Set((question.tags ?? []).map((t) => t.id)));
      const opts = (question.options ?? []).map((o) => ({
        uid: crypto.randomUUID(),
        content: o.content,
        isCorrect: o.isCorrect,
        explanation: o.explanation ?? "",
      }));
      setOptions(opts);
      // FILL_BLANK stores its accepted answers as correct options.
      if (question.questionType === "FILL_BLANK") {
        const acc = (question.options ?? []).filter((o) => o.isCorrect).map((o) => o.content);
        setAcceptedAnswers(acc.length ? acc : [""]);
      } else {
        setAcceptedAnswers([""]);
      }
    } else {
      setQuestionType("SINGLE_CHOICE");
      setPrompt(""); setPromptAudioUrl(""); setPromptImageUrl("");
      setExplanation(""); setHint(""); setDifficulty("");
      setSelectedTagIds(new Set());
      setOptions(defaultChoiceOptions());
      setAcceptedAnswers([""]);
    }
  }, [question]);

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Seed sensible defaults when the user switches type (kept here, not in an
  // effect, so it never fights the edit-load effect above by wiping loaded data).
  const handleTypeChange = (next: QuestionType) => {
    setQuestionType(next);
    if (next === "TRUE_FALSE") {
      setOptions(trueFalseOptions());
    } else if (next === "FILL_BLANK") {
      setOptions([]);
      setAcceptedAnswers((a) => (a.length ? a : [""]));
    } else {
      // SINGLE_CHOICE / MULTIPLE_CHOICE — keep current options unless they're
      // the fixed True/False pair (then start fresh). Single choice is a radio,
      // so collapse to exactly one correct answer.
      setOptions((prev) => {
        let base = prev.length && !isTrueFalseShape(prev) ? prev : defaultChoiceOptions();
        if (next === "SINGLE_CHOICE") {
          const idx = base.findIndex((o) => o.isCorrect);
          const keep = idx >= 0 ? idx : 0;
          base = base.map((o, i) => ({ ...o, isCorrect: i === keep }));
        }
        return base;
      });
    }
  };

  const needsOptions = !NO_OPTION_TYPES.includes(questionType);
  const isTrueFalse = questionType === "TRUE_FALSE";
  const isFillBlank = questionType === "FILL_BLANK";
  const isMultiple = questionType === "MULTIPLE_CHOICE";

  const updateOption = (uid: string, patch: Partial<OptionDraft>) =>
    setOptions((arr) => arr.map((o) => (o.uid === uid ? { ...o, ...patch } : o)));

  // Mark an option correct. MULTIPLE_CHOICE toggles (many allowed); SINGLE_CHOICE
  // and TRUE_FALSE behave like radios — exactly one stays selected.
  const setCorrect = (uid: string) =>
    setOptions((arr) =>
      arr.map((o) =>
        isMultiple
          ? (o.uid === uid ? { ...o, isCorrect: !o.isCorrect } : o)
          : { ...o, isCorrect: o.uid === uid },
      ),
    );

  // Remove an option, keeping a correct answer selected for radio types.
  const removeOption = (uid: string) =>
    setOptions((arr) => {
      const next = arr.filter((x) => x.uid !== uid);
      if (!isMultiple && next.length > 0 && !next.some((o) => o.isCorrect)) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return next;
    });

  const updateAcceptedAnswer = (i: number, val: string) =>
    setAcceptedAnswers((a) => a.map((x, idx) => (idx === i ? val : x)));
  const removeAcceptedAnswer = (i: number) =>
    setAcceptedAnswers((a) => a.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!prompt.trim()) { toast.error("Prompt is required."); return; }

    let payloadOptions: NonNullable<QuestionBankDTO["options"]>;
    if (isFillBlank) {
      const answers = acceptedAnswers.map((a) => a.trim()).filter(Boolean);
      if (answers.length === 0) { toast.error("Add at least one accepted answer."); return; }
      payloadOptions = answers.map((a, i) => ({
        id: 0, questionId: 0, isActive: true,
        content: a,
        contentAudioUrl: null, contentImageUrl: null,
        isCorrect: true,
        explanation: null,
        orderIndex: i,
      }));
    } else {
      const filled = options.filter((o) => o.content.trim());
      if (filled.length < 2) { toast.error("Add at least 2 options."); return; }
      if (!filled.some((o) => o.isCorrect)) {
        toast.error("Mark at least one correct option."); return;
      }
      payloadOptions = filled.map((o, i) => ({
        id: 0, questionId: 0, isActive: true, content: o.content.trim(),
        contentAudioUrl: null, contentImageUrl: null,
        isCorrect: o.isCorrect, explanation: o.explanation.trim() || null, orderIndex: i,
      }));
    }

    setSaving(true);
    try {
      const payload: Partial<QuestionBankDTO> = {
        isActive: true,
        questionType,
        prompt: prompt.trim(),
        promptAudioUrl: promptAudioUrl.trim() || null,
        promptImageUrl: promptImageUrl.trim() || null,
        explanation: explanation.trim() || null,
        hint: hint.trim() || null,
        difficultyLevel: (difficulty || null) as QuestionBankDTO["difficultyLevel"],
        defaultScore: 1,
        tagIds: Array.from(selectedTagIds),
        options: payloadOptions,
      };
      const saved = question
        ? await assessmentApi.updateQuestion(question.id, payload)
        // New questions from the quiz wizard are private to that quiz.
        : await assessmentApi.createQuestion(
            ownerQuizId != null ? { ...payload, ownerQuizId } : payload,
          );
      toast.success("Question saved.");
      onSaved(saved);
    } catch {
      toast.error("Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  // ── Validity (a question must always have an answer) ──
  const filledOptions = options.filter((o) => o.content.trim());
  const hasCorrect = options.some((o) => o.isCorrect && o.content.trim());
  const optionsValid = isFillBlank
    ? acceptedAnswers.some((a) => a.trim() !== "")
    : filledOptions.length >= 2 && hasCorrect;
  const canSave = prompt.trim() !== "" && optionsValid;

  // Guard the Cancel button: if there's content typed, confirm before discarding.
  const hasContent =
    prompt.trim() !== "" ||
    explanation.trim() !== "" ||
    hint.trim() !== "" ||
    filledOptions.length > 0 ||
    acceptedAnswers.some((a) => a.trim() !== "");
  const requestCancel = () => {
    if (hasContent) setConfirmCancelOpen(true);
    else onCancel();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <SearchableSelect
            value={questionType}
            onValueChange={(v) => handleTypeChange(v as QuestionType)}
            options={ACTIVE_QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <SearchableSelect
            value={difficulty || "none"}
            onValueChange={(v) => setDifficulty(v === "none" ? "" : v)}
            options={[
              { value: "none", label: "None" },
              ...["EASY", "MEDIUM", "HARD", "N5", "N4", "N3", "N2", "N1"].map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Prompt</Label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} maxLength={500} className="max-h-40 resize-none" placeholder="The question text…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MediaInput label="Audio (optional)" value={promptAudioUrl} onChange={setPromptAudioUrl} type="audio" />
        <MediaInput label="Image (optional)" value={promptImageUrl} onChange={setPromptImageUrl} type="image" />
      </div>

      {/* Options (SINGLE_CHOICE / MULTIPLE_CHOICE / TRUE_FALSE) */}
      {needsOptions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Options</Label>
            <span className="text-xs text-muted-foreground">
              {isMultiple ? "Tick every correct answer" : "Select the correct answer"}
            </span>
          </div>
          {options.map((o) => (
            <div
              key={o.uid}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2 transition-colors",
                o.isCorrect ? "border-green-500/50 bg-green-500/5" : "border-border",
              )}
            >
              {/* Correct toggle — radio for single/TF, checkbox for multiple */}
              <button
                type="button"
                onClick={() => setCorrect(o.uid)}
                aria-pressed={o.isCorrect}
                title={o.isCorrect ? "Correct answer" : "Mark as correct"}
                className={cn(
                  "mt-1.5 shrink-0 flex size-5 items-center justify-center border transition-colors",
                  isMultiple ? "rounded-md" : "rounded-full",
                  o.isCorrect
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-muted-foreground/40 text-transparent hover:border-green-500/60",
                )}
              >
                <Check className="size-3.5" />
              </button>
              <div className="flex-1 space-y-1.5">
                <Input
                  value={o.content}
                  disabled={isTrueFalse}
                  onChange={(e) => updateOption(o.uid, { content: e.target.value })}
                  placeholder="Option text"
                />
                {!isTrueFalse && (
                  <Input value={o.explanation} onChange={(e) => updateOption(o.uid, { explanation: e.target.value })} placeholder="Explanation (optional)" className="text-xs" />
                )}
              </div>
              {!isTrueFalse && (
                <Button variant="ghost" size="sm" className="text-destructive shrink-0"
                  disabled={options.length <= 2}
                  onClick={() => removeOption(o.uid)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {isTrueFalse ? (
            <p className="text-xs text-muted-foreground">True/False options are fixed.</p>
          ) : options.length < 6 ? (
            <Button variant="outline" size="sm" onClick={() => setOptions((arr) => [...arr, makeOption()])}>
              <Plus className="size-4 mr-1" />Add option
            </Button>
          ) : null}
          {/* "Always an answer" guard */}
          {!isTrueFalse && filledOptions.length >= 2 && !hasCorrect && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Select the correct answer{isMultiple ? "(s)" : ""} for this question.
            </p>
          )}
        </div>
      )}

      {/* Accepted answers (FILL_BLANK) */}
      {isFillBlank && (
        <div className="space-y-2">
          <Label>Accepted answers (case-insensitive)</Label>
          {acceptedAnswers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={ans}
                onChange={(e) => updateAcceptedAnswer(i, e.target.value)}
                placeholder={`Accepted answer ${i + 1}`}
              />
              {acceptedAnswers.length > 1 && (
                <Button variant="ghost" size="sm" className="text-destructive shrink-0"
                  onClick={() => removeAcceptedAnswer(i)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {acceptedAnswers.length < 5 && (
            <Button variant="outline" size="sm" onClick={() => setAcceptedAnswers((a) => [...a, ""])}>
              <Plus className="size-4 mr-1" />Add answer
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            All listed answers will be accepted. Comparison ignores case and trims spaces.
          </p>
          {!optionsValid && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Add at least one accepted answer.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Explanation</Label>
          <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} maxLength={500} className="max-h-40 resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hint</Label>
          <Textarea value={hint} onChange={(e) => setHint(e.target.value)} rows={2} maxLength={500} className="max-h-40 resize-none" />
        </div>
      </div>

      {/* Tags — selection only; create/manage tags lives in the Question Bank. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tags</Label>
          {selectedTagIds.size > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{selectedTagIds.size} selected</span>
          )}
        </div>
        <TagChips
          tags={allTags}
          selectedIds={selectedTagIds}
          onToggle={toggleTag}
          emptyHint="No tags yet — create them from the Question Bank."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
