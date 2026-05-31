import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ankiStudyApi, deckApi } from "@/api";
import type { AnkiBucketCount, AnkiDayCount, AnkiStatsDTO } from "@/api/features/library/ankiStudy.api";
import type { DeckDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";

/* ─────────────────────────────────────────
   Bar chart — CSS-only, no library
───────────────────────────────────────── */
function BarChart({
  data, colorFn, height = 140, labelEvery = 1,
}: {
  data: { label: string; value: number }[];
  colorFn?: (i: number) => string;
  height?: number;
  labelEvery?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full space-y-1">
      <div className="flex items-end gap-px" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 2 : 0, Math.round((d.value / max) * height));
          return (
            <div key={i} className="flex-1 flex items-end min-w-0" title={`${d.label}: ${d.value}`}>
              <div className={cn("w-full rounded-t-sm", colorFn ? colorFn(i) : "bg-primary")} style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-px text-[9px] text-muted-foreground">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center truncate min-w-0">
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
      <div className="px-5 py-4 flex-1">{children}</div>
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
  const futureDue = (stats?.futureReviews ?? []).map((d: AnkiDayCount, i) => ({
    label: d.dayOffset === 0 ? "T" : d.dayOffset % 5 === 0 ? `+${d.dayOffset}` : "",
    value: d.count,
    i,
  }));
  const intervals = (stats?.intervalBuckets ?? []).map((b: AnkiBucketCount) => ({ label: b.label, value: b.count }));
  const eases     = (stats?.easeBuckets ?? []).map((b: AnkiBucketCount)     => ({ label: b.label, value: b.count }));

  const totalFuture   = futureDue.reduce((s, d) => s + d.value, 0);
  const memScore      = stats?.avgMemoryScore ?? 0;
  const memTone       = memScore >= 75 ? "text-green-600" : memScore >= 50 ? "text-amber-500" : "text-red-500";
  const memBarCls     = memScore >= 75 ? "bg-green-500" : memScore >= 50 ? "bg-amber-400" : "bg-red-400";

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
        <div className="flex flex-col items-center justify-center h-60 gap-2 text-muted-foreground">
          <Brain className="size-12 opacity-20" />
          <p className="text-sm">Select an Anki deck above to view statistics.</p>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Today */}
            <Panel title="Today">
              <div className="space-y-0.5">
                {stats.studiedToday === 0 && (
                  <p className="text-sm text-muted-foreground pb-2">No cards have been studied today.</p>
                )}
                {stats.studiedToday > 0 && (
                  <StatRow label="Studied today" value={stats.studiedToday} tone="text-primary" />
                )}
                <StatRow label="Due today"        value={stats.dueToday}     tone={stats.dueToday > 0 ? "text-amber-500" : undefined} />
                <StatRow label="Due tomorrow"     value={stats.dueTomorrow} />
                <StatRow label="Average memory"   value={`${stats.avgMemoryScore.toFixed(0)}%`} tone={memTone} />
                <StatRow label="Total reviews"    value={stats.totalReviews} />
                <StatRow label="Average interval" value={`${stats.avgIntervalDays.toFixed(1)} days`} />
                <StatRow label="Lapses"           value={stats.totalLapses}  tone={stats.totalLapses > 0 ? "text-red-500" : undefined} />
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
                height={140}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Review Intervals */}
            <Panel
              title="Review Intervals"
              subtitle="Delays until review cards are shown again."
              footer={<>Median interval: {stats.avgIntervalDays.toFixed(1)} days</>}
            >
              <BarChart
                data={intervals}
                colorFn={() => "bg-sky-500"}
                height={140}
              />
            </Panel>

            {/* Card Ease */}
            <Panel
              title="Card Ease"
              subtitle="The lower the ease, the more frequently a card will appear."
              footer={<>Median ease: {(stats.avgEaseFactor * 100).toFixed(0)}%</>}
            >
              <BarChart
                data={eases}
                colorFn={(i) => i <= 1 ? "bg-red-400" : i <= 3 ? "bg-green-500" : "bg-blue-400"}
                height={140}
              />
            </Panel>

            {/* Memory Score / Retention */}
            <Panel
              title="Retention"
              subtitle="SM2 memory score — estimated pass rate per card."
            >
              <div className="space-y-5 pt-1">
                {/* Big score */}
                <div className="text-center">
                  <p className={cn("text-6xl font-bold tabular-nums leading-none", memTone)}>
                    {memScore.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Average retention</p>
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
                  <StatRow label="Learning"      value={stats.learningCards + stats.relearningCards} tone="text-orange-500" />
                  <StatRow label="Review"        value={stats.reviewCards}                          tone="text-green-600" />
                  <StatRow label="Ease factor"   value={`${(stats.avgEaseFactor * 100).toFixed(0)}%`} />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
