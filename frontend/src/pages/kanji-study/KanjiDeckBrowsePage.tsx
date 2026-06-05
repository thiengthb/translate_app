import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { kanjiDeckApi } from "@/api/features/kanji_study";
import type { KanjiDeckDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { useDeckKanji } from "./hooks/useDeckKanji";

/**
 * Browse the kanji inside a single kanji deck. Each card links to the kanji detail view.
 *
 * The deck's kanji come from the shared {@link useDeckKanji} cache (one items
 * request + one cached all-details request) rather than a `getById` per kanji,
 * so opening a 200-card deck no longer fires 200 requests (which tripped the
 * rate limiter).
 */
export default function KanjiDeckBrowsePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<KanjiDeckDTO | null>(null);
  const { kanji, isLoading } = useDeckKanji(deckId);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    kanjiDeckApi
      .getById(deckId)
      .then((d) => !cancelled && setDeck(d))
      .catch(() => !cancelled && setDeck(null));
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  return (
    <KanjiLayout>
      <div className="pb-8">
        <button
          onClick={() => navigate("/kanji-study/decks")}
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
        <p className="text-sm text-gray-400 mt-1">{kanji.length} Hán tự</p>

        {isLoading ? (
          <p className="text-gray-400 mt-6">Đang tải...</p>
        ) : kanji.length === 0 ? (
          <p className="text-gray-400 mt-6">Deck này chưa có Hán tự nào.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {kanji.map(({ itemId, kanji: k }) => (
              <button
                key={itemId ?? k.id}
                onClick={() => k.id && navigate(`/kanji-study/kanji/${k.id}?deck=${deckId}`)}
                className="group aspect-square rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-rose-400 hover:shadow-md transition flex flex-col items-center justify-center p-2"
              >
                <span className="text-4xl font-serif text-gray-900 dark:text-gray-100 group-hover:text-rose-600">
                  {k.character ?? "…"}
                </span>
                {k.meaning && (
                  <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center line-clamp-1">
                    {k.meaning}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}
