import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuestionTagDTO, QuestionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TagChips, TagCreateInline } from "./QuestionTags";

const QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "WRITING", "MATCHING", "ORDERING", "LISTENING",
];
const NO_OPTION_TYPES: QuestionType[] = ["WRITING"];

interface OptionDraft {
  uid: string;
  content: string;
  isCorrect: boolean;
  explanation: string;
}

const makeOption = (): OptionDraft => ({ uid: crypto.randomUUID(), content: "", isCorrect: false, explanation: "" });

/**
 * Presentational create/edit form for a question-bank entry.
 * Rendered full-page by QuestionFormPage and inline inside QuestionPickerModal.
 */
export function QuestionForm({
  question, onSaved, onCancel,
}: {
  question?: QuestionBankDTO | null;
  onSaved: (q: QuestionBankDTO) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [promptAudioUrl, setPromptAudioUrl] = useState("");
  const [promptImageUrl, setPromptImageUrl] = useState("");
  const [explanation, setExplanation] = useState("");
  const [hint, setHint] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([makeOption(), makeOption()]);

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
      setOptions(
        (question.options ?? []).map((o) => ({
          uid: crypto.randomUUID(),
          content: o.content,
          isCorrect: o.isCorrect,
          explanation: o.explanation ?? "",
        }))
      );
    } else {
      setQuestionType("SINGLE_CHOICE");
      setPrompt(""); setPromptAudioUrl(""); setPromptImageUrl("");
      setExplanation(""); setHint(""); setDifficulty("");
      setSelectedTagIds(new Set());
      setOptions([makeOption(), makeOption()]);
    }
  }, [question]);

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const needsOptions = !NO_OPTION_TYPES.includes(questionType);

  const updateOption = (uid: string, patch: Partial<OptionDraft>) =>
    setOptions((arr) => arr.map((o) => (o.uid === uid ? { ...o, ...patch } : o)));

  const handleSave = async () => {
    if (!prompt.trim()) { toast.error("Prompt is required."); return; }
    const filled = options.filter((o) => o.content.trim());
    if (needsOptions) {
      if (filled.length < 2) { toast.error("Add at least 2 options."); return; }
      if (!filled.some((o) => o.isCorrect) && questionType !== "ORDERING" && questionType !== "MATCHING") {
        toast.error("Mark at least one correct option."); return;
      }
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
        options: needsOptions
          ? filled.map((o, i) => ({
              id: 0, questionId: 0, isActive: true, content: o.content.trim(),
              contentAudioUrl: null, contentImageUrl: null,
              isCorrect: o.isCorrect, explanation: o.explanation.trim() || null, orderIndex: i,
            }))
          : [],
      };
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={difficulty || "none"} onValueChange={(v) => setDifficulty(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {["EASY","MEDIUM","HARD","N5","N4","N3","N2","N1"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Prompt</Label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="The question text…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Audio URL (optional)</Label>
          <Input value={promptAudioUrl} onChange={(e) => setPromptAudioUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Image URL (optional)</Label>
          <Input value={promptImageUrl} onChange={(e) => setPromptImageUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>

      {needsOptions && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((o) => (
            <div key={o.uid} className="flex items-start gap-2">
              <label className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground shrink-0">
                <Switch checked={o.isCorrect} onCheckedChange={(c) => updateOption(o.uid, { isCorrect: c })} />
                Correct
              </label>
              <div className="flex-1 space-y-1.5">
                <Input value={o.content} onChange={(e) => updateOption(o.uid, { content: e.target.value })} placeholder="Option text" />
                <Input value={o.explanation} onChange={(e) => updateOption(o.uid, { explanation: e.target.value })} placeholder="Explanation (optional)" className="text-xs" />
              </div>
              <Button variant="ghost" size="sm" className="text-destructive shrink-0"
                disabled={options.length <= 1}
                onClick={() => setOptions((arr) => arr.filter((x) => x.uid !== o.uid))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {options.length < 6 && (
            <Button variant="outline" size="sm" onClick={() => setOptions((arr) => [...arr, makeOption()])}>
              <Plus className="size-4 mr-1" />Add option
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Explanation</Label>
          <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hint</Label>
          <Textarea value={hint} onChange={(e) => setHint(e.target.value)} rows={2} />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagChips
          tags={allTags}
          selectedIds={selectedTagIds}
          onToggle={toggleTag}
          emptyHint="No tags yet — create one below."
        />
        <TagCreateInline
          onCreated={(tag) => {
            setAllTags((prev) => [...prev.filter((t) => t.id !== tag.id), tag]);
            setSelectedTagIds((prev) => new Set(prev).add(tag.id));
          }}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}Save question
        </Button>
      </div>
    </div>
  );
}
