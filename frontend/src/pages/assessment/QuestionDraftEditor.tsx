import { useRef, useState } from "react";
import { fileApi } from "@/api/features/file.api";
import type { QuestionTagDTO, QuestionType } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Check, ImageIcon, Loader2, Music, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TagChips } from "./QuestionTags";
import {
  ACTIVE_QUESTION_TYPES,
  makeOption,
  NO_OPTION_TYPES,
  optionsForType,
  TYPE_LABELS,
  type DraftField,
  type DraftFieldError,
  type QuestionDraft,
} from "./questionDraft";

/* ── Media input: click to upload a local file OR paste a link ── */
function MediaInput({
  label, value, onChange, type,
}: {
  label: string; value: string; onChange: (v: string) => void; type: "image" | "audio";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
      {showPreview && type === "image" && (
        <img src={value} alt="preview" className="max-h-40 rounded-md border border-border object-contain bg-muted/30" />
      )}
      {showPreview && type === "audio" && (
        <audio controls src={value} className="w-full h-9" />
      )}
    </div>
  );
}

/**
 * Controlled editor for a single question draft. Owns no draft state of its
 * own — every change is emitted through `onChange` so a parent can hold one
 * draft (single-question form) or many (multi-draft workspace). Pass `errors`
 * to surface field-specific problems inline (e.g. after a batch Create).
 */
export function QuestionDraftEditor({
  draft, onChange, allTags, errors = [],
}: {
  draft: QuestionDraft;
  onChange: (patch: Partial<QuestionDraft>) => void;
  allTags: QuestionTagDTO[];
  errors?: DraftFieldError[];
}) {
  const errorFor = (field: DraftField) => errors.find((e) => e.field === field)?.message;

  const isTrueFalse = draft.questionType === "TRUE_FALSE";
  const isFillBlank = draft.questionType === "FILL_BLANK";
  const isMultiple = draft.questionType === "MULTIPLE_CHOICE";
  const needsOptions = !NO_OPTION_TYPES.includes(draft.questionType);

  const handleTypeChange = (next: QuestionType) =>
    onChange({
      questionType: next,
      options: optionsForType(next, draft.options),
      acceptedAnswers: next === "FILL_BLANK" && draft.acceptedAnswers.length === 0 ? [""] : draft.acceptedAnswers,
    });

  const updateOption = (uid: string, patch: Partial<QuestionDraft["options"][number]>) =>
    onChange({ options: draft.options.map((o) => (o.uid === uid ? { ...o, ...patch } : o)) });

  // MULTIPLE_CHOICE toggles; SINGLE_CHOICE / TRUE_FALSE behave like radios.
  const setCorrect = (uid: string) =>
    onChange({
      options: draft.options.map((o) =>
        isMultiple
          ? (o.uid === uid ? { ...o, isCorrect: !o.isCorrect } : o)
          : { ...o, isCorrect: o.uid === uid },
      ),
    });

  const removeOption = (uid: string) => {
    const next = draft.options.filter((x) => x.uid !== uid);
    if (!isMultiple && next.length > 0 && !next.some((o) => o.isCorrect)) {
      next[0] = { ...next[0], isCorrect: true };
    }
    onChange({ options: next });
  };

  const updateAcceptedAnswer = (i: number, val: string) =>
    onChange({ acceptedAnswers: draft.acceptedAnswers.map((x, idx) => (idx === i ? val : x)) });
  const removeAcceptedAnswer = (i: number) =>
    onChange({ acceptedAnswers: draft.acceptedAnswers.filter((_, idx) => idx !== i) });

  const promptError = errorFor("prompt");
  const optionsError = errorFor("options");
  const answersError = errorFor("acceptedAnswers");

  const filledOptions = draft.options.filter((o) => o.content.trim());
  const hasCorrect = draft.options.some((o) => o.isCorrect && o.content.trim());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <SearchableSelect
            value={draft.questionType}
            onValueChange={(v) => handleTypeChange(v as QuestionType)}
            options={ACTIVE_QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <SearchableSelect
            value={draft.difficulty || "none"}
            onValueChange={(v) => onChange({ difficulty: v === "none" ? "" : v })}
            options={[
              { value: "none", label: "None" },
              ...["EASY", "MEDIUM", "HARD", "N5", "N4", "N3", "N2", "N1"].map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Content</Label>
        <Textarea
          value={draft.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          rows={3}
          maxLength={500}
          className="max-h-40 resize-none"
          placeholder="The question text…"
          aria-invalid={!!promptError}
        />
        {promptError && <p className="text-xs text-destructive">{promptError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MediaInput label="Audio (optional)" value={draft.promptAudioUrl} onChange={(v) => onChange({ promptAudioUrl: v })} type="audio" />
        <MediaInput label="Image (optional)" value={draft.promptImageUrl} onChange={(v) => onChange({ promptImageUrl: v })} type="image" />
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
          {draft.options.map((o) => (
            <div
              key={o.uid}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2 transition-colors",
                o.isCorrect ? "border-green-500/50 bg-green-500/5" : "border-border",
              )}
            >
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
                <button
                  type="button"
                  title="Remove option"
                  aria-label="Remove option"
                  disabled={draft.options.length <= 2}
                  onClick={() => removeOption(o.uid)}
                  className="mt-1 shrink-0 flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {isTrueFalse ? (
            <p className="text-xs text-muted-foreground">True/False options are fixed.</p>
          ) : draft.options.length < 6 ? (
            <button
              type="button"
              onClick={() => onChange({ options: [...draft.options, makeOption()] })}
              className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="size-4" />Add option
            </button>
          ) : null}
          {optionsError ? (
            <p className="text-xs text-destructive">{optionsError}</p>
          ) : (!isTrueFalse && filledOptions.length >= 2 && !hasCorrect && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Select the correct answer{isMultiple ? "(s)" : ""} for this question.
            </p>
          ))}
        </div>
      )}

      {/* Accepted answers (FILL_BLANK) */}
      {isFillBlank && (
        <div className="space-y-2">
          <Label>Accepted answers (case-insensitive)</Label>
          {draft.acceptedAnswers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={ans}
                onChange={(e) => updateAcceptedAnswer(i, e.target.value)}
                placeholder={`Accepted answer ${i + 1}`}
              />
              {draft.acceptedAnswers.length > 1 && (
                <button
                  type="button"
                  title="Remove answer"
                  aria-label="Remove answer"
                  onClick={() => removeAcceptedAnswer(i)}
                  className="shrink-0 flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {draft.acceptedAnswers.length < 5 && (
            <button
              type="button"
              onClick={() => onChange({ acceptedAnswers: [...draft.acceptedAnswers, ""] })}
              className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="size-4" />Add answer
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            All listed answers will be accepted. Comparison ignores case and trims spaces.
          </p>
          {answersError && <p className="text-xs text-destructive">{answersError}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Explanation</Label>
          <Textarea value={draft.explanation} onChange={(e) => onChange({ explanation: e.target.value })} rows={2} maxLength={500} className="max-h-40 resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hint</Label>
          <Textarea value={draft.hint} onChange={(e) => onChange({ hint: e.target.value })} rows={2} maxLength={500} className="max-h-40 resize-none" />
        </div>
      </div>

      {/* Tags — selection only; create/manage tags lives in the Question Bank. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tags</Label>
          {draft.tagIds.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{draft.tagIds.length} selected</span>
          )}
        </div>
        <TagChips
          tags={allTags}
          selectedIds={new Set(draft.tagIds)}
          onToggle={(id) =>
            onChange({
              tagIds: draft.tagIds.includes(id)
                ? draft.tagIds.filter((t) => t !== id)
                : [...draft.tagIds, id],
            })
          }
          emptyHint="No tags yet — create them from the Question Bank."
        />
      </div>
    </div>
  );
}
