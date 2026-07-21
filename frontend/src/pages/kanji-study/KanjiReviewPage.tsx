import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BrushIcon, ListChecks } from "lucide-react";
import { kanjiProgressApi } from "@/api/features/kanji_study";
import { kanjiApi } from "@/api/features/words/kanji.api";
import type { KanjiProgressDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { getCurrentUserId } from "@/utils/auth.utils";

const MODE_LABEL: Record<string, { label: string; icon: typeof BrushIcon }> = {
  quiz: { label: "Trắc nghiệm", icon: ListChecks },
  writing: { label: "Viết", icon: BrushIcon },
};

/**
 * SRS review session landing. Resolves which kanji are due now and lists
 * them for the chosen mode (quiz / writing). The interactive answer runner
 * is a later slice — this surfaces the real due queue today.
 */
export default function KanjiReviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") ?? "quiz";
  const modeInfo = MODE_LABEL[mode] ?? MODE_LABEL.quiz;
  const userId = getCurrentUserId();

  const [due, setDue] = useState<KanjiProgressDTO[]>([]);
  const [chars, setChars] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const progress = await kanjiProgressApi
        .getPage({ page: 0, size: 1000 }, undefined, (userId ? { userId } : {}) as never)
        .then((r) => (r.content ?? []) as KanjiProgressDTO[])
        .catch(() => [] as KanjiProgressDTO[]);

      const now = Date.now();
      const dueItems = progress.filter(
        (p) => p.nextReviewAt && new Date(p.nextReviewAt).getTime() <= now
      );
      if (cancelled) return;
      setDue(dueItems);
      setIsLoading(false);

      const ids = dueItems.map((p) => p.kanjiId).filter((x): x is number => x != null).slice(0, 60);
      const kanjis = await Promise.all(ids.map((id) => kanjiApi.getById(String(id)).catch(() => null)));
      if (cancelled) return;
      const map: Record<number, string> = {};
      ids.forEach((id, i) => {
        const c = kanjis[i]?.character;
        if (c) map[id] = c;
      });
      setChars(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const ModeIcon = modeInfo.icon;
  const previewChars = useMemo(
    () => due.map((p) => (p.kanjiId != null ? chars[p.kanjiId] : undefined)).filter(Boolean),
    [due, chars]
  );

  return (
    <KanjiLayout pageScroll>
      <div className="max-w-3xl mx-auto w-full pb-8">
        <button
          onClick={() => navigate("/kanji-study")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Trang chủ
        </button>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80">
            <ModeIcon size={16} /> Ôn tập SRS · {modeInfo.label}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold">{isLoading ? "…" : due.length}</span>
            <span className="text-white/80">Hán tự cần ôn hôm nay</span>
          </div>
        </div>

        {!isLoading && due.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-center">
            🎉 Không có Hán tự nào tới hạn. Quay lại sau nhé!
          </p>
        ) : (
          <>
            {previewChars.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {previewChars.map((c, i) => (
                  <span
                    key={i}
                    className="grid place-items-center h-12 w-12 rounded-xl border border-border bg-card font-serif text-2xl text-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            <button
              disabled
              className="mt-6 w-full rounded-xl bg-rose-500 text-white font-semibold py-3 opacity-60 cursor-not-allowed"
              title="Trình ôn tập tương tác sẽ ra mắt ở bước tiếp theo"
            >
              Bắt đầu phiên {modeInfo.label} (sắp ra mắt)
            </button>
          </>
        )}
      </div>
    </KanjiLayout>
  );
}
