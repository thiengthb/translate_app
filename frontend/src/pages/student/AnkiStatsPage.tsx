import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ankiStudyApi, deckApi } from "@/api";
import type { AnkiBucketCount, AnkiDayCount, AnkiStatsDTO } from "@/api/features/library/ankiStudy.api";
import type { DeckDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";

/* ─────────────────────────────────────────
   Bar chart — CSS-only, fills parent height
───────────────────────────────────────── */
function BarChart({
  data, colorFn, labelEvery = 1,
}: {
  data: { label: string; value: number }[];
  colorFn?: (i: number) => string;
  labelEvery?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {/* bars — grow to fill available height */}
      <div className="flex items-end gap-0.75 flex-1 min-h-25">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const color = colorFn ? colorFn(i) : "bg-primary";
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
              title={`${d.label}: ${d.value}`}
            >
              {d.value > 0 && (
                <span className="text-[9px] tabular-nums text-foreground/60 mb-0.5 leading-none shrink-0">
                  {d.value}
                </span>
              )}
              <div
                className={cn("w-full rounded-t-sm transition-all", d.value > 0 ? color : "bg-transparent")}
                style={{ height: d.value > 0 ? `${Math.max(pct, 5)}%` : "0%" }}
              />
            </div>
          );
        })}
      </div>
      {/* x-axis labels */}
      <div className="flex gap-0.75 shrink-0 pt-1.5 mt-1.5 border-t border-border/30">
        {data.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 text-center min-w-0 truncate leading-tight text-[10px]",
              d.value > 0 ? "text-foreground/75 font-semibold" : "text-muted-foreground/40"
            )}
          >
            {i % labelEvery === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Stacked bar + table (Card Counts)
───────────────────────────────────────── */
function StateBar({ newC, learning, relearning, review, total }: {
  newC: number; learning: number; relearning: number; review: number; total: number;
}) {
  if (total === 0) return <p className="text-sm text-muted-foreground py-4">No cards.</p>;
  const pct = (v: number) => `${((v / total) * 100).toFixed(2)}%`;
  const segs = [
    { label: "New",        v: newC,       dot: "bg-blue-500",   text: "text-blue-500" },
    { label: "Learning",   v: learning,   dot: "bg-orange-400", text: "text-orange-400" },
    { label: "Relearning", v: relearning, dot: "bg-red-500",    text: "text-red-500" },
    { label: "Review",     v: review,     dot: "bg-green-500",  text: "text-green-500" },
  ];
  return (
    <div className="space-y-3">
      {/* stacked bar */}
      <div className="flex h-5 rounded overflow-hidden gap-px">
        {segs.map((s) => s.v > 0 && (
          <div key={s.label} className={s.dot} style={{ width: pct(s.v) }} title={`${s.label}: ${s.v}`} />
        ))}
      </div>
      {/* legend table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left pb-1 font-normal" />
            <th className="text-right pb-1 font-normal">Cards</th>
            <th className="text-right pb-1 font-normal">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {segs.map((s) => (
            <tr key={s.label} className="leading-7">
              <td className="flex items-center gap-2 pr-4">
                <span className={cn("size-3 rounded-sm shrink-0 inline-block", s.dot)} />
                <span className={s.text}>{s.label}</span>
              </td>
              <td className="text-right tabular-nums font-semibold">{s.v}</td>
              <td className="text-right tabular-nums text-muted-foreground">{pct(s.v)}</td>
            </tr>
          ))}
          <tr className="leading-7 font-semibold">
            <td className="pr-4 text-muted-foreground">Total</td>
            <td className="text-right tabular-nums">{total}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────
   Panel — matches Anki's card style
───────────────────────────────────────── */
function Panel({ title, subtitle, footer, children }: {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border/50">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-4 flex-1 flex flex-col min-h-0">{children}</div>
      {footer && (
        <div className="px-5 py-2.5 border-t border-border/50 text-center text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

/* ── Row label ── */
function StatRow({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  );
}

/* ── Big FSRS metric (stability / difficulty) ── */
function FsrsMetric({ label, value, hint, tone }: {
  label: string; value: string; hint: string; tone?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-bold tabular-nums leading-tight", tone)}>{value}</p>
      <p className="text-[11px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function AnkiStatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDeckId = searchParams.get("deck") ? Number(searchParams.get("deck")) : null;
  const userId = getCurrentUserId();

  const [ankiDecks, setAnkiDecks] = useState<DeckDTO[]>([]);
  const [stats, setStats]         = useState<AnkiStatsDTO | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!userId) return;
    deckApi.getPage({ page: 0, size: 100 }, undefined, { userId, studyMode: "ANKI" } as never)
      .then((r) => setAnkiDecks(r.content ?? [])).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!selectedDeckId) { setStats(null); return; }
    setLoading(true);
    ankiStudyApi.getStats(selectedDeckId)
      .then(setStats)
      .catch(() => toast.error("Failed to load statistics."))
      .finally(() => setLoading(false));
  }, [selectedDeckId]);

  const selectDeck = (id: string) => {
    const p = new URLSearchParams(searchParams);
    p.set("deck", id);
    setSearchParams(p);
  };

  /* Data prep */
  const futureDue = (stats?.futureReviews ?? []).map((d: AnkiDayCount) => ({
    label: d.dayOffset === 0 ? "T" : d.dayOffset % 5 === 0 ? `+${d.dayOffset}` : "",
    value: d.count,
  }));
  const intervals = (stats?.intervalBuckets ?? []).map((b: AnkiBucketCount) => ({ label: b.label, value: b.count }));
  // shorten "130-160%" → "130%", "310%+" stays as-is
  const eases = (stats?.easeBuckets ?? []).map((b: AnkiBucketCount) => ({
    label: b.label.replace(/^(\d+)-\d+%$/, "$1%"),
    value: b.count,
  }));

  const totalFuture   = futureDue.reduce((s, d) => s + d.value, 0);
  const memScore      = stats?.avgMemoryScore ?? 0;
  const memTone       = memScore >= 75 ? "text-green-600" : memScore >= 50 ? "text-amber-500" : "text-red-500";
  const memBarCls     = memScore >= 75 ? "bg-green-500" : memScore >= 50 ? "bg-amber-400" : "bg-red-400";
  const isFsrs        = stats?.algorithmType === "FSRS";

  return (
    <MainLayout pathName={{ "/stats": "Statistics" }}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold tracking-tight">Statistics</h1>
        <Select value={selectedDeckId ? String(selectedDeckId) : ""} onValueChange={selectDeck}>
          <SelectTrigger className="w-72 h-9">
            <SelectValue placeholder="Select an Anki deck…" />
          </SelectTrigger>
          {/* position="popper" forces the list to always open BELOW the trigger,
              preventing Radix from flipping it upward when the trigger is near
              the top of the scrollable content area. */}
          <SelectContent position="popper" sideOffset={4} className="w-72 max-h-64">
            {ankiDecks.length === 0
              ? <div className="px-3 py-2 text-sm text-muted-foreground">No Anki decks.</div>
              : ankiDecks.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    <span className="truncate">{d.title ?? "Untitled"}</span>
                    <span className="ml-1.5 shrink-0 text-xs text-muted-foreground">({d.totalCards ?? 0})</span>
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Empty / Loading ── */}
      {!selectedDeckId && !loading && (
        <EmptyState
          className="h-60"
          icon={<Brain className="size-7" />}
          title="Select an Anki deck above to view statistics."
        />
      )}
      {loading && (
        <div className="flex items-center justify-center h-60">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Dashboard — 3 columns, 2 rows like Anki ── */}
      {stats && !loading && (
        <div className="space-y-4">

          {/* Row 1: Today | Future Due | Card Counts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[minmax(300px,auto)]">

            {/* Today */}
            <Panel title="Today">
              <div className="space-y-0.5">
                {stats.studiedToday === 0 && (
                  <p className="text-sm text-muted-foreground pb-2">No cards have been studied today.</p>
                )}
                {stats.studiedToday > 0 && (
                  <StatRow label="Studied today" value={stats.studiedToday} tone="text-primary" />
                )}
                <StatRow label="Due review cards" value={stats.dueReviewCards} tone={stats.dueReviewCards > 0 ? "text-green-600" : undefined} />
                <StatRow label="Due tomorrow"     value={stats.dueTomorrow} />
                <StatRow label="Average memory"   value={`${stats.avgMemoryScore.toFixed(0)}%`} tone={memTone} />
                <StatRow label="Total reviews"    value={stats.totalReviews} />
                <StatRow label="Average interval" value={`${stats.avgIntervalDays.toFixed(1)} days`} />
                <StatRow label="Lapses"           value={stats.totalLapses}  tone={stats.totalLapses > 0 ? "text-red-500" : undefined} />
                {stats.leechCards > 0 && (
                  <StatRow label="Leeches" value={stats.leechCards} tone="text-red-500" />
                )}
                {stats.suspendedCards > 0 && (
                  <StatRow label="Suspended" value={stats.suspendedCards} tone="text-muted-foreground" />
                )}
              </div>
            </Panel>

            {/* Future Due */}
            <Panel
              title="Future Due"
              subtitle="The number of reviews due in the future."
              footer={
                <>
                  Total: {totalFuture} reviews &nbsp;·&nbsp; Avg: {(totalFuture / 30).toFixed(1)} / day
                </>
              }
            >
              <BarChart
                data={futureDue}
                colorFn={(i) => i === 0 ? "bg-amber-400" : i === 1 ? "bg-green-500" : "bg-primary/70"}
              />
            </Panel>

            {/* Card Counts */}
            <Panel title="Card Counts">
              <StateBar
                newC={stats.newCards}
                learning={stats.learningCards}
                relearning={stats.relearningCards}
                review={stats.reviewCards}
                total={stats.totalCards}
              />
            </Panel>
          </div>

          {/* Row 2: Review Intervals | Card Ease | Memory Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[minmax(300px,auto)]">

            {/* Review Intervals */}
            <Panel
              title="Review Intervals"
              subtitle="Delays until review cards are shown again."
              footer={<>Average interval: {stats.avgIntervalDays.toFixed(1)} days</>}
            >
              <BarChart
                data={intervals}
                colorFn={() => "bg-sky-500"}
              />
            </Panel>

            {/* Card Ease (SM-2) — or FSRS memory (stability/difficulty) */}
            {isFsrs ? (
              <Panel
                title="FSRS Memory"
                subtitle="Stability (how long memory lasts) & difficulty (how hard the card is)."
                footer={<>Avg difficulty: {stats.avgDifficulty.toFixed(1)} / 10</>}
              >
                <div className="flex flex-1 flex-col justify-center gap-6 pt-1">
                  <FsrsMetric
                    label="Average stability"
                    value={`${stats.avgStability.toFixed(1)} days`}
                    hint="Higher = memory decays slower, longer intervals."
                    tone="text-sky-500"
                  />
                  <FsrsMetric
                    label="Average difficulty"
                    value={`${stats.avgDifficulty.toFixed(1)} / 10`}
                    hint="Lower = easier to remember."
                    tone={stats.avgDifficulty <= 4 ? "text-green-600" : stats.avgDifficulty <= 7 ? "text-amber-500" : "text-red-500"}
                  />
                </div>
              </Panel>
            ) : (
              <Panel
                title="Card Ease"
                subtitle="The lower the ease, the more frequently a card will appear."
                footer={<>Average ease: {(stats.avgEaseFactor * 100).toFixed(0)}%</>}
              >
                <BarChart
                  data={eases}
                  colorFn={(i) => i <= 1 ? "bg-red-400" : i <= 3 ? "bg-green-500" : "bg-blue-400"}
                />
              </Panel>
            )}

            {/* Memory Score / Retention */}
            <Panel
              title="Retention"
              subtitle={isFsrs
                ? "FSRS memory score — estimated recall probability per card."
                : "SM2 memory score — estimated pass rate per card."}
            >
              <div className="space-y-5 pt-1">
                {/* Big score */}
                <div className="text-center">
                  <p className={cn("text-6xl font-bold tabular-nums leading-none", memTone)}>
                    {memScore.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{isFsrs ? "Average retention (now)" : "Average memory"}</p>
                </div>

                {/* Gauge bar */}
                <div className="space-y-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", memBarCls)}
                      style={{ width: `${Math.min(100, memScore)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>

                {/* State rows */}
                <div className="space-y-0.5">
                  <StatRow label="New"           value={stats.newCards}                             tone="text-blue-500" />
                  {stats.newAvailableToday < stats.newCards && (
                    <StatRow label="New today"   value={stats.newAvailableToday}                    tone="text-blue-400" />
                  )}
                  <StatRow label="Learning"      value={stats.learningCards + stats.relearningCards} tone="text-orange-500" />
                  <StatRow label="Review"        value={stats.reviewCards}                          tone="text-green-600" />
                  {isFsrs
                    ? <StatRow label="Avg stability" value={`${stats.avgStability.toFixed(1)}d`} />
                    : <StatRow label="Ease factor"   value={`${(stats.avgEaseFactor * 100).toFixed(0)}%`} />}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
