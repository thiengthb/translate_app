import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { classroomApi } from "@/api";
import type { AttemptSummary, ClassAssignmentDTO, ClassroomDTO, GradebookDTO, StudentResultDTO } from "@/types";
import type { AttemptStatus } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  BarChart3, CalendarClock, CheckCircle2, ChevronDown,
  Clock, Loader2, RefreshCw, Repeat, Target, TrendingUp, Trophy, Users,
} from "lucide-react";
import { toast } from "sonner";
import { AttemptStatusBadge, formatDateTime, formatSeconds } from "@/pages/assessment/_shared";

const ASSIGNMENT_STATUS_STYLE: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  CLOSED:    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function AssignmentStatsPage() {
  const { classroomId, assignmentId } = useParams<{ classroomId: string; assignmentId: string }>();
  const cid = Number(classroomId);
  const aid = Number(assignmentId);
  const navigate = useNavigate();

  const [classroom, setClassroom]   = useState<ClassroomDTO | null>(null);
  const [assignment, setAssignment] = useState<ClassAssignmentDTO | null>(null);
  const [gradebook, setGradebook]   = useState<GradebookDTO | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [expanded, setExpanded]     = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [c, a, g] = await Promise.all([
        classroomApi.getClassroomById(cid),
        classroomApi.getAssignmentById(aid),
        classroomApi.getGradebook(aid),
      ]);
      setClassroom(c); setAssignment(a); setGradebook(g);
    } catch {
      setError(true);
      toast.error("Failed to load assignment statistics.");
    } finally {
      setLoading(false);
    }
  }, [cid, aid]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (userId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  /* ── Derived aggregate stats ── */
  const agg = useMemo(() => {
    const results = gradebook?.results ?? [];
    const totalStudents  = gradebook?.totalStudents ?? 0;
    const submitted      = results.filter((r) => r.submittedAt != null).length;
    const passed         = gradebook?.passedCount ?? 0;
    const attempted      = results.filter((r) => r.attemptCount > 0).length;
    const totalAttempts  = results.reduce((s, r) => s + r.attemptCount, 0);
    return {
      totalStudents,
      submitted,
      passed,
      passRate:       totalStudents ? Math.round((passed / totalStudents) * 100) : 0,
      completionRate: totalStudents ? Math.round((submitted / totalStudents) * 100) : 0,
      avgScore:       gradebook?.averageScore ?? 0,
      avgAttempts:    attempted ? totalAttempts / attempted : 0,
    };
  }, [gradebook]);

  const pathName = {
    "/classrooms": "Groups",
    [`/classrooms/${cid}`]: classroom?.name ?? "Group",
    [`/classrooms/${cid}/stats/${aid}`]: assignment?.title ?? "Statistics",
  };
  // Hide only the fixed "stats" keyword segment. The remaining crumbs are the
  // group (a valid link) and the assignment (the current page) — so the
  // breadcrumb reads Home › Groups › <group> › <assignment> with no broken
  // links, even when the group id and assignment id happen to be equal.
  const ignorePaths = ["stats"];

  if (loading) {
    return (
      <MainLayout pathName={pathName} ignorePaths={ignorePaths} breadcrumbIcon={<BarChart3 className="size-[18px] text-primary" />}>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout pathName={pathName} ignorePaths={ignorePaths} breadcrumbIcon={<BarChart3 className="size-[18px] text-primary" />}>
        <EmptyState
          className="h-60"
          icon={<BarChart3 className="size-7" />}
          title="Couldn't load these statistics."
          description="Something went wrong fetching the assignment data. Please try again."
          action={{ label: "Retry", icon: <RefreshCw className="size-4" />, onClick: () => void load() }}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout pathName={pathName} ignorePaths={ignorePaths} breadcrumbIcon={<BarChart3 className="size-[18px] text-primary" />}>
      <div className="space-y-5">
        {/* ── Assignment header ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">{assignment?.title}</h1>
                {assignment && (
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    ASSIGNMENT_STATUS_STYLE[assignment.status] ?? ASSIGNMENT_STATUS_STYLE.DRAFT
                  )}>
                    {assignment.status}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/70">{assignment?.quizTitle}</span>
                {assignment?.deadline && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3.5" />Due {formatDateTime(assignment.deadline)}
                    </span>
                  </>
                )}
                {assignment?.maxAttempts != null && (
                  <><span>·</span><span>{assignment.maxAttempts} attempts max</span></>
                )}
                <span>·</span>
                <span>Scoring: {assignment?.scoreStrategy === "HIGHEST" ? "Highest" : "Latest"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary stat tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile icon={<Users className="size-4" />}        label="Students"   value={agg.totalStudents} />
          <StatTile icon={<CheckCircle2 className="size-4" />} label="Submitted"  value={`${agg.submitted}/${agg.totalStudents}`} tone="text-sky-600" />
          <StatTile icon={<Trophy className="size-4" />}       label="Passed"     value={agg.passed} tone="text-green-600" />
          <StatTile icon={<Target className="size-4" />}       label="Pass rate"  value={`${agg.passRate}%`} tone={agg.passRate >= 50 ? "text-green-600" : "text-amber-500"} />
          <StatTile icon={<TrendingUp className="size-4" />}   label="Avg score"  value={agg.avgScore.toFixed(1)} />
          <StatTile icon={<Repeat className="size-4" />}       label="Avg tries"  value={agg.avgAttempts.toFixed(1)} />
        </div>

        {/* ── Student results ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Users className="size-4 text-primary" />Students
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">{gradebook?.results.length ?? 0} total</span>
          </div>

          {(gradebook?.results.length ?? 0) === 0 ? (
            <EmptyState className="h-48" icon={<Users className="size-7" />} title="No members in this group yet." />
          ) : (
            <ul className="divide-y divide-border/50">
              {gradebook!.results.map((r) => (
                <StudentRow
                  key={r.userId}
                  r={r}
                  open={expanded.has(r.userId)}
                  onToggle={() => toggle(r.userId)}
                  onViewAttempt={
                    assignment?.quizId != null
                      ? (attemptId) => navigate(`/quizzes/${assignment.quizId}/result/${attemptId}`)
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

/* ── Stat tile ── */
function StatTile({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: string | number; tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>{label}
      </div>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

/* ── Student row (expandable) ── */
function StudentRow({ r, open, onToggle, onViewAttempt }: {
  r: StudentResultDTO; open: boolean; onToggle: () => void;
  onViewAttempt?: (attemptId: number) => void;
}) {
  const submittedAttempts = r.attempts.filter((a) => a.status === "SUBMITTED");
  const bestPct = submittedAttempts.length
    ? Math.max(...submittedAttempts.map((a) => a.percentage ?? 0))
    : null;

  const statusBadge =
    r.submittedAt == null ? (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Not submitted
      </span>
    ) : r.isPassed ? (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
        Passed
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400">
        Failed
      </span>
    );

  return (
    <li>
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">{r.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{r.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {r.attemptCount} attempt{r.attemptCount !== 1 ? "s" : ""}
            {r.submittedAt && <> · last {formatDateTime(r.submittedAt)}</>}
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className={cn(
            "text-sm font-bold tabular-nums",
            bestPct == null ? "text-muted-foreground" : bestPct >= 50 ? "text-green-600" : "text-red-500"
          )}>
            {bestPct == null ? "—" : `${bestPct.toFixed(0)}%`}
          </p>
          <p className="text-[10px] text-muted-foreground">best</p>
        </div>
        {statusBadge}
      </button>

      {/* Expanded attempts */}
      {open && (
        <div className="bg-muted/25 px-5 pb-3 pt-1">
          {r.attempts.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">No attempts yet.</p>
          ) : (
            <div className="space-y-1.5">
              {r.attempts.map((a) => <AttemptRow key={a.attemptId} a={a} onView={onViewAttempt} />)}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* ── One attempt detail row ── */
function AttemptRow({ a, onView }: { a: AttemptSummary; onView?: (attemptId: number) => void }) {
  const pct = a.percentage ?? 0;
  const isSubmitted = a.status === "SUBMITTED";
  // Only submitted attempts have a reviewable result page.
  const clickable = isSubmitted && onView != null;
  return (
    <div
      onClick={clickable ? () => onView!(a.attemptId) : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView!(a.attemptId); } } : undefined}
      title={clickable ? "View result" : undefined}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm",
        clickable && "cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      <span className="flex items-center gap-2 shrink-0">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary tabular-nums">
          {a.attemptNumber}
        </span>
        <AttemptStatusBadge status={a.status as AttemptStatus} />
      </span>

      {isSubmitted ? (
        <>
          <span className={cn(
            "font-bold tabular-nums",
            a.isPassed ? "text-green-600" : "text-red-500"
          )}>
            {pct.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {(a.earnedScore ?? 0).toFixed(1)} / {(a.totalScore ?? 0).toFixed(1)} pts
          </span>
          <span className="flex items-center gap-2 text-xs tabular-nums">
            <span className="text-green-600">✓ {a.correctQuestions}</span>
            <span className="text-red-500">✗ {a.wrongQuestions}</span>
            <span className="text-muted-foreground">– {a.skippedQuestions}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <Clock className="size-3" />{formatSeconds(a.timeSpentSeconds)}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(a.submittedAt)}</span>
        </>
      ) : (
        <span className="ml-auto text-xs text-muted-foreground">
          Started {formatDateTime(a.startedAt)}
        </span>
      )}
    </div>
  );
}
