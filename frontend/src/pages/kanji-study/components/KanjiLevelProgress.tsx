import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LevelProgress } from "../hooks/useKanjiDashboard";

interface Props {
  levels: LevelProgress[];
  totalLearned: number;
  statusCounts: { new: number; learning: number; known: number };
}

/**
 * Per-level progress toward the 2000-kanji goal, JLPT-style.
 * Totals come from the user-provided decks; the filled portion is how many
 * kanji in that level the user has started/finished.
 */
export function KanjiLevelProgress({ levels, totalLearned, statusCounts }: Props) {
  const grandTotal = levels.reduce((s, l) => s + l.total, 0);

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
        <div className="flex gap-3 pt-2 text-xs">
          <Legend color="bg-rose-500" label={`Thành thạo ${statusCounts.known}`} />
          <Legend color="bg-rose-300" label={`Đang học ${statusCounts.learning}`} />
          <Legend color="bg-muted-foreground/30" label={`Mới ${statusCounts.new}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {levels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Chưa có cấp độ nào. Hãy thêm deck (kèm cấp độ) trong mục Content → Decks.
          </p>
        ) : (
          levels.map((lv) => {
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
          })
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
