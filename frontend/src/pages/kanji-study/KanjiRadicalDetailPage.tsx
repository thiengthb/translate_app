import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Grid, Languages } from "lucide-react";
import { kanjiDetailApi, kanjiRadicalApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiRadicalDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { KanjiByComponentList } from "./components/KanjiByComponentList";

/**
 * Detail view of a single bộ thủ (radical): character, Hán-Việt name, meaning,
 * Kangxi number, stroke count — plus every kanji whose chiết-tự tree contains
 * it. Opened from the radical grid or from the component popup on a kanji page.
 */
export default function KanjiRadicalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [radical, setRadical] = useState<KanjiRadicalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    kanjiRadicalApi
      .getById(id)
      .then((r) => !cancelled && setRadical(r))
      .catch(() => !cancelled && setRadical(null))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The radical itself may also exist as a studyable kanji (e.g. 立) — link to it.
  const char = radical?.character;
  const { data: selfKanji } = useQuery<KanjiDetailDTO | null>({
    queryKey: ["kanji-by-char", char],
    enabled: !!char,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await kanjiDetailApi.getPage({ page: 0, size: 10 }, char!);
      const list = (res.content ?? (res as any).items ?? []) as KanjiDetailDTO[];
      return list.find((k) => k.character === char) ?? null;
    },
  });

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value == null || value === "" ? null : (
      <div className="flex gap-3 py-2 border-b border-border/60">
        <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
    );

  return (
    <KanjiLayout>
      <div className="max-w-3xl mx-auto pb-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải...</p>
        ) : !radical ? (
          <p className="text-muted-foreground">Không tìm thấy bộ thủ.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* ── Header: character + info ── */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 self-center sm:self-start">
                <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <span className="text-7xl font-serif text-white">{radical.character}</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Grid className="text-teal-500" size={18} />
                  <h1 className="text-xl font-bold text-foreground">
                    Bộ {radical.hanViet ?? radical.character}
                  </h1>
                </div>
                <Row label="Hán-Việt" value={radical.hanViet} />
                <Row label="Ý nghĩa" value={radical.meaning} />
                <Row label="Khang Hy (康熙)" value={radical.number != null ? `#${radical.number}` : undefined} />
                <Row label="Số nét" value={radical.strokeCount} />

                {selfKanji?.id != null && (
                  <button
                    type="button"
                    onClick={() => navigate(`/kanji-study/kanji/${selfKanji.id}`)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    <Languages size={15} /> Xem chữ Hán 「{radical.character}」
                  </button>
                )}
              </div>
            </div>

            {/* ── Kanji containing this radical as a component ── */}
            {radical.character && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Hán tự chứa bộ 「{radical.character}」
                </h2>
                <KanjiByComponentList
                  component={radical.character}
                  onSelect={(k) => k.id != null && navigate(`/kanji-study/kanji/${k.id}`)}
                />
              </section>
            )}
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}
