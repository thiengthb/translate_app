import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { DifficultyLevel, QuizDTO, QuizQuestionDTO, QuizVisibility } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronLeft, ChevronRight, ListChecks, Loader2, Save, Send, Library } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuestionBankSelector } from "./QuestionBankSelector";
import { SelectedQuestionsPanel } from "./SelectedQuestionsPanel";

const DIFFICULTIES: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD", "N5", "N4", "N3", "N2", "N1"];

export default function QuizCreateEditPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const isEditMode = quizId != null;

  const [id, setId] = useState<number | null>(quizId ? Number(quizId) : null);
  const [loading, setLoading] = useState(!!quizId);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);
  // A NEW quiz auto-saves a draft when entering step 2 (so questions can attach).
  // If the author cancels without ever saving/publishing, that draft and its
  // quick-created private questions are discarded.
  const [keepDraft, setKeepDraft] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Two-step wizard: 1 = configuration, 2 = question selection.
  const [step, setStep] = useState<1 | 2>(1);
  // Inline field errors are surfaced once the author first tries to advance.
  const [showErrors, setShowErrors] = useState(false);

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<string>("none");
  const [passScore, setPassScore] = useState<string>("");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [isRandomQuestion, setIsRandomQuestion] = useState(false);
  const [isRandomOption, setIsRandomOption] = useState(false);
  const [allowRetake, setAllowRetake] = useState(true);
  const [showAnswerAfterSubmit, setShowAnswerAfterSubmit] = useState(true);
  const [visibility, setVisibility] = useState<QuizVisibility>("PRIVATE");

  useEffect(() => {
    if (id == null) return;
    setLoading(true);
    Promise.all([assessmentApi.fetchQuizById(id), assessmentApi.fetchQuizQuestions(id)])
      .then(([q, qs]) => {
        setTitle(q.title);
        setDescription(q.description ?? "");
        setDifficulty(q.difficultyLevel ?? "none");
        setPassScore(String(q.passScore));
        setTimeLimit(q.timeLimitMinutes != null ? String(q.timeLimitMinutes) : "");
        setMaxAttempts(q.maxAttempts != null ? String(q.maxAttempts) : "");
        setIsRandomQuestion(q.isRandomQuestion);
        setIsRandomOption(q.isRandomOption);
        setAllowRetake(q.allowRetake);
        setShowAnswerAfterSubmit(q.showAnswerAfterSubmit);
        setVisibility(q.visibility);
        setQuestions(qs);
      })
      .catch(() => toast.error("Failed to load quiz."))
      .finally(() => setLoading(false));
  }, [id]);

  const buildPayload = (): Partial<QuizDTO> => ({
    title: title.trim(),
    description: description.trim() || null,
    creatorId: userId ?? null,
    difficultyLevel: difficulty !== "none" ? (difficulty as DifficultyLevel) : null,
    passScore: Number(passScore),
    timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
    maxAttempts: maxAttempts ? Number(maxAttempts) : null,
    isRandomQuestion, isRandomOption, allowRetake, showAnswerAfterSubmit, visibility,
  });

  // Only the title is required by the backend. The other fields are optional,
  // but if filled must hold a sensible value. Errors render inline (below).
  const step1Errors = {
    title: title.trim() === "" ? "Title is required." : undefined,
    passScore:
      passScore.trim() !== "" && (Number(passScore) < 0 || Number(passScore) > 100)
        ? "Pass score must be between 0 and 100."
        : undefined,
    timeLimit:
      timeLimit.trim() !== "" && !(Number(timeLimit) > 0)
        ? "Time must be a positive number of minutes."
        : undefined,
    maxAttempts:
      maxAttempts.trim() !== "" && !(Number(maxAttempts) > 0)
        ? "Max attempts must be at least 1."
        : undefined,
  };
  const step1Valid =
    !step1Errors.title && !step1Errors.passScore && !step1Errors.timeLimit && !step1Errors.maxAttempts;

  const persist = async (): Promise<number | null> => {
    if (!title.trim()) { toast.error("Title is required."); return null; }
    setSaving(true);
    try {
      if (id == null) {
        const created = await assessmentApi.createQuiz(buildPayload());
        setId(created.id);
        return created.id;
      }
      await assessmentApi.updateQuiz(id, buildPayload());
      return id;
    } catch {
      toast.error("Failed to save quiz.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const savedId = await persist();
    if (savedId) { setKeepDraft(true); toast.success("Draft saved."); }
  };

  // Cancelling a never-saved NEW quiz throws away the auto-created draft and any
  // questions quick-created privately for it.
  const handleCancel = async () => {
    if (!isEditMode && id != null && !keepDraft) {
      try { await assessmentApi.discardQuiz(id); } catch { /* best-effort */ }
    }
    navigate("/quizzes");
  };

  // There's something to lose if a draft already exists or any field was filled.
  const hasUnsavedWork =
    !keepDraft &&
    (id != null || title.trim() !== "" || description.trim() !== "" || questions.length > 0);

  // Guard the Cancel button so an accidental click doesn't silently discard work.
  const requestCancel = () => {
    if (hasUnsavedWork) setDiscardOpen(true);
    else void handleCancel();
  };

  const handlePublish = async () => {
    const savedId = await persist();
    if (!savedId) return;
    setKeepDraft(true);
    if (questions.length === 0) { toast.error("Add at least one question before publishing."); return; }
    try {
      await assessmentApi.publishQuiz(savedId);
      toast.success(isEditMode ? "Quiz updated." : "Quiz created.");
      navigate(`/quizzes/${savedId}`);
    } catch {
      toast.error("Failed to publish.");
    }
  };

  // Step 1 → 2: every field must be filled, then persist the configuration
  // (the draft must exist so questions attach to a saved quiz).
  const handleNext = async () => {
    if (!step1Valid) {
      setShowErrors(true);
      return;
    }
    const savedId = await persist();
    if (savedId) setStep(2);
  };

  // Guard step navigation from the indicator: you can always go back to
  // step 1, but reaching step 2 must go through handleNext (saves step 1).
  const goToStep = (target: 1 | 2) => {
    if (target === 1) { setStep(1); return; }
    if (id != null && step1Valid) setStep(2);  // already saved & valid → free to jump
    else handleNext();
  };

  const reloadQuestions = (qid: number) => assessmentApi.fetchQuizQuestions(qid).then(setQuestions).catch(() => {});

  const handleAddQuestion = async (questionId: number) => {
    let targetId = id;
    if (targetId == null) {
      targetId = await persist();
      if (!targetId) return;
    }
    try {
      await assessmentApi.addQuizQuestion({ quizId: targetId, questionId, orderIndex: questions.length });
      await reloadQuestions(targetId);
    } catch {
      toast.error("Failed to add question.");
    }
  };

  const handleRemoveQuestion = async (quizQuestionId: number) => {
    if (id == null) return;
    await assessmentApi.removeQuizQuestion(quizQuestionId);
    await reloadQuestions(id);
  };

  // Clicking a bank question toggles it in/out of the quiz.
  const handleToggleQuestion = async (questionId: number) => {
    const existing = questions.find((qq) => qq.questionId === questionId);
    if (existing) await handleRemoveQuestion(existing.id);
    else await handleAddQuestion(questionId);
  };

  const selectedQuestionIds = new Set(questions.map((qq) => qq.questionId));

  if (loading) {
    return (
      <MainLayout pathName={{ "/quizzes": "Quizzes" }}>
        <div className="flex items-center justify-center h-60"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </MainLayout>
    );
  }

  const headerExtra = <StepBar step={step} onStepClick={goToStep} />;

  return (
    <MainLayout
      pathName={{ "/quizzes": "Quizzes", [id ? `/quizzes/${id}/edit` : "/quizzes/create"]: id ? "Edit quiz" : "Create" }}
      headerExtra={headerExtra}
    >
      <div className={cn("w-full mx-auto space-y-6 transition-[max-width]", step === 1 ? "max-w-3xl" : "max-w-full")}>
        {/* ── Step 1 · Configuration ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quiz title"
                aria-invalid={showErrors && !!step1Errors.title}
              />
              {showErrors && step1Errors.title && (
                <p className="text-xs text-destructive">{step1Errors.title}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className="max-h-40 resize-none" placeholder="What is this quiz about?" />
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <SearchableSelect
                value={difficulty === "none" ? "" : difficulty}
                onValueChange={setDifficulty}
                placeholder="Select difficulty"
                options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pass score (%)</Label>
                <Input type="number" min={0} max={100} value={passScore} onChange={(e) => setPassScore(e.target.value)} placeholder="e.g. 60"
                  aria-invalid={showErrors && !!step1Errors.passScore} />
                {showErrors && step1Errors.passScore && (
                  <p className="text-xs text-destructive">{step1Errors.passScore}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time (min)</Label>
                <Input type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="e.g. 30"
                  aria-invalid={showErrors && !!step1Errors.timeLimit} />
                {showErrors && step1Errors.timeLimit && (
                  <p className="text-xs text-destructive">{step1Errors.timeLimit}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max attempts</Label>
                <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="e.g. 3"
                  aria-invalid={showErrors && !!step1Errors.maxAttempts} />
                {showErrors && step1Errors.maxAttempts && (
                  <p className="text-xs text-destructive">{step1Errors.maxAttempts}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <SearchableSelect
                value={visibility}
                onValueChange={(v) => setVisibility(v as QuizVisibility)}
                options={[
                  { value: "PRIVATE", label: "Private" },
                  { value: "PUBLIC", label: "Public" },
                  { value: "UNLISTED", label: "Unlisted" },
                ]}
              />
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Toggle label="Randomize questions" v={isRandomQuestion} set={setIsRandomQuestion} />
              <Toggle label="Randomize options" v={isRandomOption} set={setIsRandomOption} />
              <Toggle label="Allow retake" v={allowRetake} set={setAllowRetake} />
              <Toggle label="Show answer after submit" v={showAnswerAfterSubmit} set={setShowAnswerAfterSubmit} />
            </div>
          </div>
        )}

        {/* ── Step 2 · Question selection (two tabs) ── */}
        {step === 2 && (
          <div className="space-y-3">
            <Tabs defaultValue="bank" className="space-y-3">
              <TabsList>
                <TabsTrigger value="bank" className="gap-1.5">
                  <Library className="size-4" />Question bank
                </TabsTrigger>
                <TabsTrigger value="selected" className="gap-1.5">
                  <ListChecks className="size-4" />Selected
                  <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary tabular-nums">
                    {questions.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="mt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  Click a question to add or remove it. Nothing is saved until you create the quiz.
                </p>
                <QuestionBankSelector
                  selectedIds={selectedQuestionIds}
                  onToggle={handleToggleQuestion}
                  quizId={id}
                  onChanged={() => {
                    if (id != null) return reloadQuestions(id);
                  }}
                />
              </TabsContent>

              <TabsContent value="selected" className="mt-0">
                <SelectedQuestionsPanel
                  placements={questions}
                  quizId={id}
                  onRemove={handleRemoveQuestion}
                  onAddCreated={handleAddQuestion}
                  onChanged={() => {
                    if (id != null) return reloadQuestions(id);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step navigation — both steps must finish to create a quiz. */}
        <div className="flex items-center justify-between gap-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={requestCancel}>Cancel</Button>
              <Button onClick={handleNext} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Next: select questions
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="size-4 mr-1" />Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}Save draft
                </Button>
                {questions.length === 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button disabled className="pointer-events-none">
                          <Send className="size-4 mr-1" />{isEditMode ? "Save & publish" : "Create quiz"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Add at least one question to publish.</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button onClick={handlePublish} disabled={saving}>
                    <Send className="size-4 mr-1" />{isEditMode ? "Save & publish" : "Create quiz"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Guard against accidentally quitting a quiz you're creating. */}
      <ConfirmDialog
        open={discardOpen}
        tone="warning"
        title="Discard this quiz?"
        description="You haven't finished creating this quiz. Your draft and any added questions will be permanently deleted."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => { setDiscardOpen(false); void handleCancel(); }}
        onCancel={() => setDiscardOpen(false)}
      />
    </MainLayout>
  );
}

/* ── Two-step progress indicator ── */
function StepBar({ step, onStepClick }: { step: 1 | 2; onStepClick: (s: 1 | 2) => void }) {
  const steps = [
    { n: 1 as const, label: "Configuration" },
    { n: 2 as const, label: "Questions" },
  ];
  return (
    <div className="flex h-8 items-center gap-2 whitespace-nowrap">
      {steps.map((s, i) => {
        const isActive = step === s.n;
        const isDone = step > s.n;
        return (
          <div key={s.n} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepClick(s.n)}
              className="group flex h-8 items-center gap-2 rounded-full px-1.5 transition-colors hover:bg-accent/60"
            >
              <span
                className={
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors " +
                  (isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-accent")
                }
              >
                {isDone ? <Check className="size-4" /> : s.n}
              </span>
              <span
                className={
                  "hidden text-sm font-medium transition-colors sm:inline " +
                  (isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")
                }
              >
                {s.label}
              </span>
            </button>
            {i === 0 && <div className="h-px w-6 bg-border sm:w-10" />}
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ label, v, set }: { label: string; v: boolean; set: (b: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={v} onCheckedChange={set} />
    </div>
  );
}
