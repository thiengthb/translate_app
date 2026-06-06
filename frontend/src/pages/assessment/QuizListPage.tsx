import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentApi } from "@/api";
import type { QuizDTO, UserQuizProgressDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Clock, FileQuestion, Loader2, Plus, RotateCcw, Search } from "lucide-react";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { DataPagination } from "@/components/common/DataPagination";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { DifficultyBadge, QuizStatusBadge } from "./_shared";
import type { DifficultyLevel } from "@/types";

type Tab = "mine" | "explore";
const DIFFICULTIES: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD", "N5", "N4", "N3", "N2", "N1"];
// Multiples of 3 so pages fill the lg 3-column grid evenly.
const PAGE_SIZES = [9, 18, 36];

export default function QuizListPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [tab, setTab] = useState<Tab>("mine");
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, UserQuizProgressDTO>>({});
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  useEffect(() => {
    setLoading(true);
    const params = {
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
  }, [tab, difficulty, search, userId]);

  // Any change to the result set (filters/tab) or page size returns to page 1.
  useEffect(() => {
    setPage(1);
  }, [tab, difficulty, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(quizzes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = quizzes.slice(pageStart, pageStart + pageSize);

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
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 pb-4">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes…"
              className="pl-9"
            />
          </div>

          <SearchableSelect
            className="w-36"
            value={difficulty}
            onValueChange={setDifficulty}
            placeholder="Difficulty"
            options={[
              { value: "all", label: "All levels" },
              ...DIFFICULTIES.map((d) => ({ value: d, label: d })),
            ]}
          />

          <Button onClick={() => navigate("/quizzes/create")}>
            <Plus className="size-4 mr-1" />
            Create quiz
          </Button>
        </div>

        {/* Content (scrolls; footer below stays pinned) */}
        <ScrollHintContainer axis="vertical" viewportClassName="px-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2 pb-4">
            {pageItems.map((quiz) => {
              const progress = progressMap[quiz.id];
              const used = progress?.attemptCount ?? 0;
              const max = quiz.maxAttempts; // null → unlimited
              const left = max != null ? Math.max(0, max - used) : null;
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto flex-wrap">
                    <span className="flex items-center gap-1"><FileQuestion className="size-3.5" />{quiz.totalQuestions} Q</span>
                    {quiz.timeLimitMinutes != null && (
                      <span className="flex items-center gap-1"><Clock className="size-3.5" />{quiz.timeLimitMinutes}m</span>
                    )}
                    <span
                      className={cn("flex items-center gap-1", max != null && left === 0 && "text-red-600 font-medium")}
                      title="Your attempts (used / allowed)"
                    >
                      <RotateCcw className="size-3.5" />
                      {max != null ? `${used}/${max} · ${left} left` : `${used} taken`}
                    </span>
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
        </ScrollHintContainer>

        {/* Footer — total + page size (left), page navigator (right).
            Pinned to the bottom like the My Library page; uses the shared
            <DataPagination/>. */}
        <div className="shrink-0 border-t border-border bg-background px-2 py-1.5 flex flex-wrap items-center justify-end gap-3 min-h-[44px]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              Tổng: <span className="font-semibold text-foreground">{quizzes.length}</span>
            </span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataPagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </MainLayout>
  );
}
