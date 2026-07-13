import { useEffect, useMemo, useRef, useState } from "react";
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
import { Clock, FileQuestion, Plus, RotateCcw, Search } from "lucide-react";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { DataPagination } from "@/components/common/DataPagination";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Debounce the search box so the list is fetched once the user pauses typing,
  // not on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  // Load the quiz list. Progress is fetched separately (below), only for the
  // page in view — avoids an N+1 fetch across the whole result set on each load.
  useEffect(() => {
    setLoading(true);
    const params = {
      ...(difficulty !== "all" ? { difficultyLevel: difficulty as DifficultyLevel } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    };
    const loader =
      tab === "mine"
        ? assessmentApi.fetchQuizzes({ ...params, ...(userId ? { creatorId: userId } : {}) })
        : assessmentApi.fetchPublicQuizzes(params);

    let cancelled = false;
    loader
      .then((data) => { if (!cancelled) setQuizzes(data); })
      .catch(() => { if (!cancelled) toast.error("Failed to load quizzes."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, difficulty, debouncedSearch, userId]);

  // A new result set (filters/tab) clears cached progress and returns to page 1.
  const fetchedProgressRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    setPage(1);
    fetchedProgressRef.current = new Set();
    setProgressMap({});
  }, [tab, difficulty, debouncedSearch, pageSize]);

  const totalPages = Math.max(1, Math.ceil(quizzes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = quizzes.slice(pageStart, pageStart + pageSize);

  // Fetch progress lazily for the questions on the current page only, skipping
  // any we've already looked up for this result set.
  useEffect(() => {
    if (!userId || pageItems.length === 0) return;
    const missing = pageItems.filter((q) => !fetchedProgressRef.current.has(q.id));
    if (missing.length === 0) return;
    missing.forEach((q) => fetchedProgressRef.current.add(q.id));
    let cancelled = false;
    Promise.all(
      missing.map((q) =>
        assessmentApi.getQuizProgress(userId, q.id).catch(() => null).then((p) => [q.id, p] as const)
      )
    ).then((entries) => {
      if (cancelled) return;
      setProgressMap((prev) => {
        const next: Record<number, UserQuizProgressDTO> = { ...prev };
        for (const [id, p] of entries) if (p) next[id] = p;
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage, pageSize, quizzes, userId]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 mt-auto">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState
            className="h-60"
            icon={<FileQuestion className="size-7" />}
            title={tab === "mine" ? "You haven't created any quizzes yet." : "No public quizzes found."}
            action={
              tab === "mine"
                ? { label: "Create quiz", icon: <Plus className="size-4" />, onClick: () => navigate("/quizzes/create") }
                : undefined
            }
          />
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
              Total: <span className="font-semibold text-foreground">{quizzes.length}</span>
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
