import { Lock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LevelProgress } from "../hooks/useKanjiDashboard";
import { PROFICIENCY_LEVELS, type KanjiProficiency } from "../lib/kanjiProficiency";

interface Props {
  levels: LevelProgress[];
  totalLearned: number;
  proficiencyCounts: Record<KanjiProficiency, number>;
}

/**
 * "Tiến độ Hán tự" — the learner's progress, on two axes:
 *  - the proficiency ladder (Chưa biết → Đã biết → Đã quen → Biết rõ → Thành
 *    thạo) as a distribution bar + legend, where "Thành thạo" is reserved for
 *    the Challenges feature;
 *  - per-JLPT-level coverage toward the deck totals.
 */
export function KanjiLevelProgress({ levels, totalLearned, proficiencyCounts }: Props) {
  const grandTotal = levels.reduce((s, l) => s + l.total, 0);
  const totalStudied = PROFICIENCY_LEVELS.reduce((s, l) => s + proficiencyCounts[l.key], 0);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp size={18} className="text-rose-500" />
          Tiến độ Hán tự
        </CardTitle>
        <p className="text-sm text-muted-foreground pt-1">
          <span className="text-foreground font-semibold">{totalLearned.toLocaleString()}</span>
          {grandTotal > 0 && <> / {grandTotal.toLocaleString()}</>} Hán tự đã học
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Proficiency ladder ── */}
        <div className="space-y-2.5">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {totalStudied > 0 &&
              PROFICIENCY_LEVELS.map((lv) => {
                const c = proficiencyCounts[lv.key];
                if (c === 0) return null;
                return (
                  <div
                    key={lv.key}
                    className={lv.color}
                    style={{ width: `${(c / totalStudied) * 100}%` }}
                    title={`${lv.label}: ${c}`}
                  />
                );
              })}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
            {PROFICIENCY_LEVELS.map((lv) => (
              <span key={lv.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", lv.color)} />
                <span className="font-semibold text-foreground tabular-nums">{proficiencyCounts[lv.key]}</span>
                <span className="truncate">{lv.label}</span>
                {lv.challengeOnly && (
                  <Lock size={11} className="shrink-0 text-muted-foreground/70" aria-label="Mở khoá qua Thử thách" />
                )}
              </span>
            ))}
          </div>
          {proficiencyCounts.MASTERED === 0 && (
            <p className="text-[11px] text-muted-foreground/80">
              <Lock size={10} className="mr-1 inline align-[-1px]" />
              Cấp “Thành thạo” chỉ mở khoá khi hoàn thành Thử thách (sắp ra mắt).
            </p>
          )}
        </div>

        {/* ── Per-JLPT coverage ── */}
        {levels.length > 0 && (
          <div className="space-y-3 border-t border-border/60 pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Theo cấp độ</p>
            {levels.map((lv) => {
              const pct = lv.total > 0 ? Math.min(100, Math.round((lv.learned / lv.total) * 100)) : 0;
              return (
                <div key={lv.level} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-sm font-semibold text-foreground">{lv.level}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {lv.learned}/{lv.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {levels.length === 0 && totalStudied === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa có dữ liệu học. Hãy bắt đầu một phiên Trắc nghiệm hoặc Luyện viết để theo dõi tiến độ.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
