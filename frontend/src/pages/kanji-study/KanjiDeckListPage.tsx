import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Layers, Search, Sparkles } from "lucide-react";
import { kanjiDeckApi } from "@/api/features/kanji_study";
import type { KanjiDeckDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-indigo-500 to-blue-600",
];

function gradientFor(id?: number) {
  if (id == null) return GRADIENTS[0];
  return GRADIENTS[id % GRADIENTS.length];
}

/**
 * Kanji Study landing — lists kanji decks (system + the user's own).
 * Clicking a deck opens the browse page for the kanji inside it.
 */
export default function KanjiDeckListPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<KanjiDeckDTO[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    kanjiDeckApi
      .getPage({ page: 0, size: 100 }, search)
      .then((r) => setDecks(r.content ?? (r as any).items ?? []))
      .catch(() => setDecks([]))
      .finally(() => setIsLoading(false));
  }, [search]);

  const { systemDecks, myDecks } = useMemo(() => {
    return {
      systemDecks: decks.filter((d) => d.isSystem),
      myDecks: decks.filter((d) => !d.isSystem),
    };
  }, [decks]);

  const renderDeck = (deck: KanjiDeckDTO) => (
    <button
      key={deck.id}
      onClick={() => navigate(`/kanji-study/deck/${deck.id}`)}
      className="group text-left rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={cn("h-24 bg-gradient-to-br relative", gradientFor(deck.id))}>
        <BookOpen className="absolute right-3 bottom-3 text-white/80" size={28} />
        {deck.jlptLevel && (
          <span className="absolute left-3 top-3 text-xs font-semibold bg-white/25 text-white px-2 py-0.5 rounded-full">
            {deck.jlptLevel}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
          {deck.title ?? "Untitled deck"}
        </h3>
        {deck.description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{deck.description}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Layers size={14} />
          <span>{deck.totalKanji ?? 0} kanji</span>
        </div>
      </div>
    </button>
  );

  return (
    <KanjiLayout>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-rose-500" size={22} />
          <h1 className="text-2xl font-bold text-foreground">Decks</h1>
        </div>
        <p className="text-muted-foreground mb-6">Chọn một bộ Hán tự để bắt đầu học.</p>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm deck..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {isLoading ? (
          <p className="text-gray-400">Đang tải...</p>
        ) : decks.length === 0 ? (
          <p className="text-gray-400">Chưa có deck nào.</p>
        ) : (
          <div className="space-y-8">
            {systemDecks.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Bộ có sẵn</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemDecks.map(renderDeck)}
                </div>
              </section>
            )}
            {myDecks.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Deck của tôi</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myDecks.map(renderDeck)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}
