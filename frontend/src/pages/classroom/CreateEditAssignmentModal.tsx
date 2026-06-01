import { useEffect, useState } from "react";
import { assessmentApi, classroomApi } from "@/api";
import type { ClassAssignmentDTO, QuizDTO, ScoreStrategy } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";

const toLocalInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? v : null);

export function CreateEditAssignmentModal({
  classroomId, assignment, open, onClose, onSaved,
}: {
  classroomId: number;
  assignment?: ClassAssignmentDTO | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quizId, setQuizId] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [scoreStrategy, setScoreStrategy] = useState<ScoreStrategy>("LAST");
  const [availableFrom, setAvailableFrom] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      assessmentApi.fetchQuizzes().catch(() => []),
      assessmentApi.fetchPublicQuizzes().catch(() => []),
    ]).then(([mine, pub]) => {
      const map = new Map<number, QuizDTO>();
      [...mine, ...pub].forEach((q) => map.set(q.id, q));
      setQuizzes([...map.values()]);
    });

    if (assignment) {
      setTitle(assignment.title);
      setDescription(assignment.description ?? "");
      setQuizId(String(assignment.quizId));
      setMaxAttempts(assignment.maxAttempts != null ? String(assignment.maxAttempts) : "0");
      setScoreStrategy(assignment.scoreStrategy);
      setAvailableFrom(toLocalInput(assignment.availableFrom));
      setDeadline(toLocalInput(assignment.deadline));
    } else {
      setTitle(""); setDescription(""); setQuizId("");
      setMaxAttempts("1"); setScoreStrategy("LAST"); setAvailableFrom(""); setDeadline("");
    }
  }, [open, assignment]);

  const persist = async (): Promise<ClassAssignmentDTO | null> => {
    if (!title.trim()) { toast.error("Title is required."); return null; }
    if (!quizId) { toast.error("Select a quiz."); return null; }
    setSaving(true);
    try {
      const payload: Partial<ClassAssignmentDTO> = {
        classroomId,
        quizId: Number(quizId),
        title: title.trim(),
        description: description.trim() || null,
        maxAttempts: Number(maxAttempts) === 0 ? null : Number(maxAttempts),
        scoreStrategy,
        availableFrom: fromLocalInput(availableFrom),
        deadline: fromLocalInput(deadline),
      };
      return assignment
        ? await classroomApi.updateAssignment(assignment.id, payload)
        : await classroomApi.createAssignment(payload);
    } catch {
      toast.error("Failed to save assignment.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const a = await persist();
    if (a) { toast.success("Saved as draft."); onSaved(); onClose(); }
  };

  const savePublish = async () => {
    const a = await persist();
    if (!a) return;
    try {
      await classroomApi.publishAssignment(a.id);
      toast.success("Assignment published.");
      onSaved();
      onClose();
    } catch {
      toast.error("Saved but failed to publish.");
    }
  };

  const selectedQuiz = quizzes.find((q) => String(q.id) === quizId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit assignment" : "New assignment"}</DialogTitle>
          <DialogDescription>Assign a quiz to this class with timing and attempt rules.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-1.5">
            <Label>Quiz</Label>
            <Select value={quizId} onValueChange={setQuizId}>
              <SelectTrigger><SelectValue placeholder="Select a quiz" /></SelectTrigger>
              <SelectContent>
                {quizzes.map((q) => <SelectItem key={q.id} value={String(q.id)}>{q.title} · {q.totalQuestions}Q</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedQuiz && <p className="text-xs text-muted-foreground">{selectedQuiz.totalQuestions} questions · pass {selectedQuiz.passScore}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Max attempts (0 = ∞)</Label>
              <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Score strategy</Label>
              <Select value={scoreStrategy} onValueChange={(v) => setScoreStrategy(v as ScoreStrategy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAST">Last attempt</SelectItem>
                  <SelectItem value="HIGHEST">Highest score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Available from</Label><Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={saveDraft} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}Save draft</Button>
          <Button onClick={savePublish} disabled={saving}><Send className="size-4 mr-1" />Save & Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
