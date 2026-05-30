import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { QuizCategoryDTO, QuizDTO, UserQuizProgressDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Clock, FileQuestion, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { DifficultyBadge, QuizStatusBadge } from "./_shared";
import type { DifficultyLevel } from "@/types";

type Tab = "mine" | "explore";
const DIFFICULTIES: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD", "N5", "N4", "N3", "N2", "N1"];

export default function QuizListPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [tab, setTab] = useState<Tab>("mine");
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [categories, setCategories] = useState<QuizCategoryDTO[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, UserQuizProgressDTO>>({});
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  useEffect(() => {
    assessmentApi.fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {
      ...(categoryId !== "all" ? { categoryId: Number(categoryId) } : {}),
      ...(difficulty !== "all" ? { difficultyLevel: difficulty as DifficultyLevel } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    };
    const loader =
      tab === "mine"
        ? assessmentApi.fetchQuizzes({ ...params, ...(userId ? { creatorId: userId } : {}) })
        : assessmentApi.fetchPublicQuizzes(params);

    loader
      .then(async (data) => {
        setQuizzes(data);
        if (userId) {
          const entries = await Promise.all(
            data.map(async (q) => {
              const p = await assessmentApi.getQuizProgress(userId, q.id).catch(() => null);
              return [q.id, p] as const;
            })
          );
          const map: Record<number, UserQuizProgressDTO> = {};
          for (const [id, p] of entries) if (p) map[id] = p;
          setProgressMap(map);
        }
      })
      .catch(() => toast.error("Failed to load quizzes."))
      .finally(() => setLoading(false));
  }, [tab, categoryId, difficulty, search, userId]);

  const headerExtra = useMemo(
    () => (
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="mine">My Quizzes</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    [tab]
  );

  return (
    <MainLayout pathName={{ "/quizzes": "Quizzes" }} headerExtra={headerExtra}>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes…"
              className="pl-9"
            />
          </div>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => navigate("/quizzes/create")}>
            <Plus className="size-4 mr-1" />
            Create quiz
          </Button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-2 text-muted-foreground">
            <FileQuestion className="size-10 opacity-40" />
            <p className="text-sm">
              {tab === "mine" ? "You haven't created any quizzes yet." : "No public quizzes found."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => {
              const progress = progressMap[quiz.id];
              return (
                <Card
                  key={quiz.id}
                  onClick={() => navigate(`/quizzes/${quiz.id}`)}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{quiz.title}</h3>
                    <QuizStatusBadge status={quiz.status} />
                  </div>
                  {quiz.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
                    <span className="flex items-center gap-1"><FileQuestion className="size-3.5" />{quiz.totalQuestions} Q</span>
                    {quiz.timeLimitMinutes != null && (
                      <span className="flex items-center gap-1"><Clock className="size-3.5" />{quiz.timeLimitMinutes}m</span>
                    )}
                    <DifficultyBadge level={quiz.difficultyLevel} />
                  </div>
                  {progress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Best: {progress.bestPercentage.toFixed(0)}%</span>
                        <span>{progress.status}</span>
                      </div>
                      <Progress value={progress.bestPercentage} className="h-1.5" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
