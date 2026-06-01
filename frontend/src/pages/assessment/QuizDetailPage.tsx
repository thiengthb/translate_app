import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { QuizAttemptDTO, QuizDTO, QuizQuestionDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Archive, ChevronLeft, Clock, Copy, FileQuestion, Loader2, Pencil, Play, Send, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { AttemptStatusBadge, DifficultyBadge, QuizStatusBadge, formatDateTime, formatSeconds } from "./_shared";

export default function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const id = Number(quizId);
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [quiz, setQuiz] = useState<QuizDTO | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const isCreator = quiz != null && quiz.creatorId != null && quiz.creatorId === userId;

  const reload = () => {
    setLoading(true);
    Promise.all([
      assessmentApi.fetchQuizById(id),
      assessmentApi.fetchQuizQuestions(id),
      assessmentApi.getMyAttempts(id).catch(() => []),
    ])
      .then(([q, qs, at]) => {
        setQuiz(q);
        setQuestions(qs);
        setAttempts(at);
      })
      .catch(() => toast.error("Failed to load quiz."))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const attempt = await assessmentApi.startAttempt({ quizId: id });
      navigate(`/quizzes/${id}/attempt/${attempt.id}`);
    } catch {
      toast.error("Could not start the quiz.");
      setStarting(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      reload();
    } catch {
      toast.error("Action failed.");
    }
  };

  if (loading) {
    return (
      <MainLayout pathName={{ "/quizzes": "Quizzes" }}>
        <div className="flex items-center justify-center h-60"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </MainLayout>
    );
  }
  if (!quiz) return null;

  return (
    <MainLayout pathName={{ "/quizzes": "Quizzes", [`/quizzes/${id}`]: quiz.title }}>
      <div className="space-y-5 max-w-5xl">
        <button onClick={() => navigate("/quizzes")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back to quizzes
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
              <QuizStatusBadge status={quiz.status} />
              <DifficultyBadge level={quiz.difficultyLevel} />
            </div>
            {quiz.description && <p className="text-sm text-muted-foreground max-w-2xl">{quiz.description}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><FileQuestion className="size-4" />{quiz.totalQuestions} questions</span>
              {quiz.timeLimitMinutes != null && <span className="flex items-center gap-1"><Clock className="size-4" />{quiz.timeLimitMinutes} min</span>}
              <span className="flex items-center gap-1"><Trophy className="size-4" />Pass: {quiz.passScore}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleStart} disabled={starting || questions.length === 0}>
              {starting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Play className="size-4 mr-1" />}
              Start quiz
            </Button>
            {isCreator && (
              <>
                <Button variant="outline" onClick={() => navigate(`/quizzes/${id}/edit`)}><Pencil className="size-4 mr-1" />Edit</Button>
                {quiz.status !== "PUBLISHED" && (
                  <Button variant="outline" onClick={() => act(() => assessmentApi.publishQuiz(id), "Published.")}><Send className="size-4 mr-1" />Publish</Button>
                )}
                {quiz.status !== "ARCHIVED" && (
                  <Button variant="outline" onClick={() => act(() => assessmentApi.archiveQuiz(id), "Archived.")}><Archive className="size-4 mr-1" />Archive</Button>
                )}
                <Button variant="outline" onClick={() => act(async () => { const c = await assessmentApi.duplicateQuiz(id); navigate(`/quizzes/${c.id}/edit`); }, "Duplicated.")}><Copy className="size-4 mr-1" />Duplicate</Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attempts">My attempts</TabsTrigger>
            {isCreator && <TabsTrigger value="questions">Questions</TabsTrigger>}
          </TabsList>

          {/* Overview — question previews, no answers */}
          <TabsContent value="overview" className="space-y-3 mt-4">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions in this quiz yet.</p>
            ) : (
              questions.map((qq, i) => (
                <Card key={qq.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{qq.question?.prompt ?? `Question #${qq.questionId}`}</p>
                      <p className="text-xs text-muted-foreground mt-1">{qq.question?.questionType} · {qq.score} pts</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* My attempts */}
          <TabsContent value="attempts" className="space-y-2 mt-4">
            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't attempted this quiz yet.</p>
            ) : (
              attempts.map((a) => (
                <Card key={a.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AttemptStatusBadge status={a.status} />
                    <span className="text-sm">{formatDateTime(a.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{a.earnedScore}/{a.totalScore} ({a.percentage.toFixed(0)}%)</span>
                    <span className="text-muted-foreground">{formatSeconds(a.timeSpentSeconds)}</span>
                    {a.status === "SUBMITTED" ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/quizzes/${id}/result/${a.id}`)}>View</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/quizzes/${id}/attempt/${a.id}`)}>Resume</Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Questions management (creator) */}
          {isCreator && (
            <TabsContent value="questions" className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{questions.length} questions placed.</p>
                <Button size="sm" onClick={() => navigate(`/quizzes/${id}/edit`)}><Pencil className="size-4 mr-1" />Manage in editor</Button>
              </div>
              <Separator />
              {questions.map((qq, i) => (
                <Card key={qq.id} className="p-3 text-sm flex items-center gap-3">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1">{qq.question?.prompt}</span>
                  <span className="text-xs text-muted-foreground">{qq.question?.questionType}</span>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
