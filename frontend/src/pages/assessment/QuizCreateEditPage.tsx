import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { DifficultyLevel, QuizCategoryDTO, QuizDTO, QuizQuestionDTO, QuizVisibility } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, GripVertical, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { QuestionPickerModal } from "./QuestionPickerModal";

const DIFFICULTIES: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD", "N5", "N4", "N3", "N2", "N1"];

export default function QuizCreateEditPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [id, setId] = useState<number | null>(quizId ? Number(quizId) : null);
  const [loading, setLoading] = useState(!!quizId);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categories, setCategories] = useState<QuizCategoryDTO[]>([]);
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [difficulty, setDifficulty] = useState<string>("none");
  const [passScore, setPassScore] = useState(0);
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [isRandomQuestion, setIsRandomQuestion] = useState(false);
  const [isRandomOption, setIsRandomOption] = useState(false);
  const [allowRetake, setAllowRetake] = useState(true);
  const [showAnswerAfterSubmit, setShowAnswerAfterSubmit] = useState(true);
  const [visibility, setVisibility] = useState<QuizVisibility>("PRIVATE");

  useEffect(() => {
    assessmentApi.fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (id == null) return;
    setLoading(true);
    Promise.all([assessmentApi.fetchQuizById(id), assessmentApi.fetchQuizQuestions(id)])
      .then(([q, qs]) => {
        setTitle(q.title);
        setDescription(q.description ?? "");
        setCategoryId(q.categoryId != null ? String(q.categoryId) : "none");
        setDifficulty(q.difficultyLevel ?? "none");
        setPassScore(q.passScore);
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
    categoryId: categoryId !== "none" ? Number(categoryId) : null,
    difficultyLevel: difficulty !== "none" ? (difficulty as DifficultyLevel) : null,
    passScore,
    timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
    maxAttempts: maxAttempts ? Number(maxAttempts) : null,
    isRandomQuestion, isRandomOption, allowRetake, showAnswerAfterSubmit, visibility,
  });

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
    if (savedId) toast.success("Draft saved.");
  };

  const handlePublish = async () => {
    const savedId = await persist();
    if (!savedId) return;
    if (questions.length === 0) { toast.error("Add at least one question before publishing."); return; }
    try {
      await assessmentApi.publishQuiz(savedId);
      toast.success("Quiz published.");
      navigate(`/quizzes/${savedId}`);
    } catch {
      toast.error("Failed to publish.");
    }
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

  if (loading) {
    return (
      <MainLayout pathName={{ "/quizzes": "Quizzes" }}>
        <div className="flex items-center justify-center h-60"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pathName={{ "/quizzes": "Quizzes", [id ? `/quizzes/${id}/edit` : "/quizzes/create"]: id ? "Edit quiz" : "New quiz" }}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/quizzes")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Back
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}Save draft
            </Button>
            <Button onClick={handlePublish} disabled={saving}><Send className="size-4 mr-1" />Publish</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — settings */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Quiz settings</h3>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pass score</Label>
                <Input type="number" value={passScore} onChange={(e) => setPassScore(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time (min)</Label>
                <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max attempts</Label>
                <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="∞" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as QuizVisibility)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="UNLISTED">Unlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Toggle label="Randomize questions" v={isRandomQuestion} set={setIsRandomQuestion} />
              <Toggle label="Randomize options" v={isRandomOption} set={setIsRandomOption} />
              <Toggle label="Allow retake" v={allowRetake} set={setAllowRetake} />
              <Toggle label="Show answer after submit" v={showAnswerAfterSubmit} set={setShowAnswerAfterSubmit} />
            </div>
          </Card>

          {/* Right — questions */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Questions ({questions.length})</h3>
              <Button size="sm" onClick={() => setPickerOpen(true)}><Plus className="size-4 mr-1" />Add question</Button>
            </div>
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No questions yet. {id == null && "Save the draft, then add questions."}
              </p>
            ) : (
              <div className="space-y-2">
                {questions.map((qq, i) => (
                  <div key={qq.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 text-sm line-clamp-1">{qq.question?.prompt ?? `#${qq.questionId}`}</span>
                    <span className="text-[10px] text-muted-foreground">{qq.question?.questionType}</span>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveQuestion(qq.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <QuestionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddQuestion}
        excludeIds={questions.map((q) => q.questionId)}
      />
    </MainLayout>
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
