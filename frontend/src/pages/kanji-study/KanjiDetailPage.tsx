import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { kanjiDetailApi, kanjiReadingApi, kanjiRadicalApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiReadingDTO, KanjiRadicalDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";

/**
 * Detail view of a single kanji (the Kanji-Study master record): character, readings,
 * meaning, stroke count and radical. Opened from the deck browse grid.
 */
export default function KanjiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [kanji, setKanji] = useState<KanjiDetailDTO | null>(null);
  const [readings, setReadings] = useState<KanjiReadingDTO[]>([]);
  const [radical, setRadical] = useState<KanjiRadicalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const k = await kanjiDetailApi.getById(id).catch(() => null);
        if (!cancelled) setKanji(k);

        const readingRes = await kanjiReadingApi.getPage(
          { page: 0, size: 50 },
          undefined,
          { kanjiId: Number(id) } as never
        );
        const list = (readingRes.content ?? (readingRes as any).items ?? []) as KanjiReadingDTO[];
        list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
        if (!cancelled) setReadings(list);

        if (k?.radicalId != null) {
          const r = await kanjiRadicalApi.getById(String(k.radicalId)).catch(() => null);
          if (!cancelled) setRadical(r);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const hanViet = readings.filter((r) => r.readingType === "HAN_VIET").map((r) => r.value).filter(Boolean);
  const nanori = readings.filter((r) => r.readingType === "NANORI").map((r) => r.value).filter(Boolean);

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value == null || value === "" ? null : (
      <div className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60">
        <span className="w-32 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-900 dark:text-gray-100">{value}</span>
      </div>
    );

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        {isLoading ? (
          <p className="text-gray-400">Đang tải...</p>
        ) : !kanji ? (
          <p className="text-gray-400">Không tìm thấy Hán tự.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0 self-center sm:self-start">
              <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-7xl font-serif text-white">{kanji.character}</span>
              </div>
            </div>

            <div className="flex-1">
              {kanji.meaning && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{kanji.meaning}</h1>
              )}
              <Row label="Onyomi (音)" value={kanji.onyomi} />
              <Row label="Kunyomi (訓)" value={kanji.kunyomi} />
              <Row label="Hán-Việt" value={hanViet.join("、")} />
              <Row label="Nanori" value={nanori.join("、")} />
              <Row label="Số nét" value={kanji.strokeCount} />
              <Row
                label="Bộ thủ"
                value={radical ? `${radical.character}${radical.hanViet ? ` (${radical.hanViet})` : ""}` : undefined}
              />
              <Row label="JLPT" value={kanji.jlptLevel} />
              <Row label="Giải tự" value={kanji.formExplanation} />
              <Row label="Từ nguyên" value={kanji.etymology} />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
