import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Star } from "lucide-react";
import type { KanjiDetailDTO } from "@/types";
import { cn } from "@/lib/utils";

/**
 * "Loại trừ từ dựa trên độ chính xác" — the review-scope picker shared by every
 * study mode. A slider sets the max accuracy to include (so well-known kanji are
 * excluded), and "Chỉ yêu thích" narrows to starred kanji. For the "Ví dụ →
 * Kanji" quiz an extra stepper picks how many examples to ask *per* kanji.
 *
 * The dialog computes the resulting count live; {@link applyScope} is the same
 * filter the runners use to build the actual study set.
 */

export interface StudyScope {
  /** Include kanji whose accuracy ≤ this (0–100). 100 = include everything. */
  accuracyMax: number;
  onlyFavorites: boolean;
  /** Examples per kanji (example quiz only); omitted for other modes. */
  examplesPerKanji?: number;
}

/** Per-kanji accuracy in [0,1]; missing/never-studied counts as 0 (always in). */
export function applyScope(
  subjects: KanjiDetailDTO[],
  accMap: Map<number, number> | undefined,
  favorites: Set<number>,
  accuracyMax: number,
  onlyFavorites: boolean
): KanjiDetailDTO[] {
  const thr = accuracyMax / 100;
  return subjects.filter((k) => {
    if (onlyFavorites && !(k.id != null && favorites.has(k.id))) return false;
    const acc = k.id != null && accMap?.has(k.id) ? accMap.get(k.id)! : 0;
    return acc <= thr + 1e-9;
  });
}

export function KanjiStudyScopeDialog({
  subjects,
  accMap,
  favorites,
  value,
  onApply,
  onClose,
}: {
  subjects: KanjiDetailDTO[];
  accMap?: Map<number, number>;
  favorites: Set<number>;
  value: StudyScope;
  onApply: (next: StudyScope) => void;
  onClose: () => void;
}) {
  const isExample = value.examplesPerKanji != null;
  const [accuracyMax, setAccuracyMax] = useState(value.accuracyMax);
  const [onlyFavorites, setOnlyFavorites] = useState(value.onlyFavorites);
  const [perKanji, setPerKanji] = useState(value.examplesPerKanji ?? 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const favInSet = useMemo(
    () => subjects.filter((k) => k.id != null && favorites.has(k.id)).length,
    [subjects, favorites]
  );
  const kanjiCount = useMemo(
    () => applyScope(subjects, accMap, favorites, accuracyMax, onlyFavorites).length,
    [subjects, accMap, favorites, accuracyMax, onlyFavorites]
  );

  const step = (delta: number) => setAccuracyMax((a) => Math.min(100, Math.max(0, a + delta)));
  const reset = () => {
    setAccuracyMax(100);
    setOnlyFavorites(false);
    setPerKanji(1);
  };

  const totalQuestions = isExample ? kanjiCount * perKanji : kanjiCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 text-center">
          <h3 className="text-base font-bold text-foreground">Loại trừ từ dựa trên độ chính xác</h3>
          <p className="mt-3 text-4xl font-extrabold text-foreground tabular-nums">
            {kanjiCount} kanji
          </p>
          {isExample && (
            <p className="mt-1 text-sm text-muted-foreground">
              {kanjiCount} × {perKanji} = <span className="font-semibold text-foreground">{totalQuestions}</span> câu hỏi
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">Sử dụng thanh trượt để thay đổi tỷ lệ</p>
          <p className="text-xs text-muted-foreground">Độ chính xác cao nhất: {accuracyMax}%</p>
        </div>

        {/* accuracy slider */}
        <div className="flex items-center gap-3 px-5 pb-2">
          <button
            onClick={() => step(-5)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground hover:border-rose-400"
            aria-label="Giảm"
          >
            <Minus size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={accuracyMax}
            onChange={(e) => setAccuracyMax(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-teal-400"
            aria-label="Độ chính xác cao nhất"
          />
          <button
            onClick={() => step(5)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground hover:border-rose-400"
            aria-label="Tăng"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* examples-per-kanji (Ví dụ → Kanji only) */}
        {isExample && (
          <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <span className="text-[15px] font-medium text-foreground">Số ví dụ mỗi kanji</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPerKanji((n) => Math.max(1, n - 1))}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground hover:border-rose-400"
                aria-label="Bớt ví dụ"
              >
                <Minus size={15} />
              </button>
              <span className="w-6 text-center text-lg font-bold tabular-nums text-foreground">{perKanji}</span>
              <button
                onClick={() => setPerKanji((n) => Math.min(10, n + 1))}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground hover:border-rose-400"
                aria-label="Thêm ví dụ"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        )}

        {/* favorites filter */}
        <button
          type="button"
          onClick={() => setOnlyFavorites((v) => !v)}
          disabled={favInSet === 0 && !onlyFavorites}
          className="mt-3 flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/50 disabled:opacity-50"
        >
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors",
              onlyFavorites ? "border-teal-400 bg-teal-400 text-gray-900" : "border-muted-foreground/40"
            )}
          >
            {onlyFavorites && <Check size={15} strokeWidth={3} />}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-foreground">
            <Star size={16} className="text-amber-400" /> Chỉ yêu thích ({favInSet})
          </span>
        </button>

        {/* actions */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button onClick={reset} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Đặt lại
          </button>
          <div className="flex items-center gap-5">
            <button onClick={onClose} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
              Hủy
            </button>
            <button
              onClick={() => onApply({ accuracyMax, onlyFavorites, examplesPerKanji: isExample ? perKanji : undefined })}
              className="text-sm font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
