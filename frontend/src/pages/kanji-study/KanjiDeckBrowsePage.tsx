import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { kanjiDeckApi, kanjiDeckItemApi } from "@/api/features/kanji_study";
import { kanjiApi } from "@/api/features/words/kanji.api";
import type { KanjiDeckDTO, KanjiDeckItemDTO } from "@/types";
import type { KanjiDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";

/**
 * Browse the kanji inside a single kanji deck. Each card links to the kanji detail view.
 */
export default function KanjiDeckBrowsePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<KanjiDeckDTO | null>(null);
  const [items, setItems] = useState<KanjiDeckItemDTO[]>([]);
  const [kanjiMap, setKanjiMap] = useState<Record<number, KanjiDTO>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const deckDto = await kanjiDeckApi.getById(deckId).catch(() => null);
        if (!cancelled) setDeck(deckDto);

        const itemsRes = await kanjiDeckItemApi.getPage(
          { page: 0, size: 500 },
          undefined,
          { deckId: Number(deckId) } as never
        );
        const list = (itemsRes.content ?? (itemsRes as any).items ?? []) as KanjiDeckItemDTO[];
        list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        if (!cancelled) setItems(list);

        const ids = Array.from(new Set(list.map((i) => i.kanjiId).filter((x): x is number => x != null)));
        const kanjis = await Promise.all(ids.map((id) => kanjiApi.getById(String(id)).catch(() => null)));
        if (!cancelled) {
          const map: Record<number, KanjiDTO> = {};
          ids.forEach((id, idx) => {
            const k = kanjis[idx];
            if (k) map[id] = k;
          });
          setKanjiMap(map);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/kanji-study")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={16} /> Tất cả deck
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {deck?.title ?? "Deck"}
        </h1>
        {deck?.description && (
          <p className="text-gray-500 dark:text-gray-400 mt-1">{deck.description}</p>
        )}
        <p className="text-sm text-gray-400 mt-1">{items.length} Hán tự</p>

        {isLoading ? (
          <p className="text-gray-400 mt-6">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-400 mt-6">Deck này chưa có Hán tự nào.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((item) => {
              const k = item.kanjiId != null ? kanjiMap[item.kanjiId] : undefined;
              return (
                <button
                  key={item.id}
                  onClick={() => item.kanjiId && navigate(`/kanji-study/kanji/${item.kanjiId}`)}
                  className="group aspect-square rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 hover:shadow-md transition flex flex-col items-center justify-center p-2"
                >
                  <span className="text-4xl font-serif text-gray-900 dark:text-gray-100 group-hover:text-violet-600">
                    {k?.character ?? "…"}
                  </span>
                  {k?.meaning && (
                    <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center line-clamp-1">
                      {k.meaning}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
