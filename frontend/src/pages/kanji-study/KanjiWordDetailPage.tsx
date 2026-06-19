import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Languages, Loader2, MessageSquareText } from "lucide-react";
import { kanjiWordApi } from "@/api/features/kanji_study";
import type {
  FuriganaSegment,
  KanjiInWord,
  KanjiSentenceItem,
  KanjiWordDetail,
} from "@/types/features/kanji_study";
import { KanjiLayout } from "./components/KanjiLayout";
import { recordViewedItem } from "./lib/kanjiSearchHistory";

/**
 * Detail view of a vocabulary word (mirrors the mobile Kanji Study app):
 * reading + word, meanings, the "Chữ Hán (N)" breakdown (each kanji links to
 * its detail page) and example sentences containing the word.
 */
const SENTENCE_PAGE_SIZE = 10;

export default function KanjiWordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // "Focus" mode: opened from inside an exercise (Học) — hide the top nav, only
  // a way back to the exact question being studied.
  const focus = searchParams.get("focus") === "1";
  const fromMode = searchParams.get("from"); // "quiz" | "writing"
  const deckParam = searchParams.get("deck");
  const groupParam = searchParams.get("group");
  const returnUrl =
    deckParam && fromMode
      ? `/kanji-study/deck/${deckParam}/${fromMode}?${groupParam ? `group=${groupParam}&` : ""}resume=1`
      : null;

  const [word, setWord] = useState<KanjiWordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    kanjiWordApi
      .detail(id)
      .then((w) => {
        if (cancelled) return;
        setWord(w);
        recordViewedItem({
          type: "word",
          id: w.id,
          label: w.word,
          sub: [w.reading, w.meanings[0]].filter(Boolean).join(" · "),
        });
      })
      .catch(() => !cancelled && setWord(null))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <KanjiLayout hideNav={focus}>
      <div className="max-w-3xl mx-auto pb-10">
        <button
          onClick={() => (focus && returnUrl ? navigate(returnUrl) : navigate(-1))}
          className={
            focus
              ? "mb-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-rose-400"
              : "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          }
        >
          <ArrowLeft size={16} /> {focus ? "Quay lại câu hỏi" : "Quay lại"}
        </button>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải...</p>
        ) : !word ? (
          <p className="text-muted-foreground">Không tìm thấy từ vựng.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* ── Header: reading over word + meanings ── */}
            <section className="rounded-2xl border border-border bg-card p-6 text-center">
              {word.reading && (
                <p className="text-base text-muted-foreground mb-1" lang="ja">
                  {word.reading}
                </p>
              )}
              <h1 className="text-5xl font-serif text-foreground" lang="ja">
                {word.word}
              </h1>

              {(word.levelName || word.levelCode || word.wordType) && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {word.wordType && <Chip>{word.wordType}</Chip>}
                  {(word.levelName || word.levelCode) && (
                    <Chip>{word.levelName ?? word.levelCode}</Chip>
                  )}
                </div>
              )}

              {word.meanings.length > 0 && (
                <ol className="mt-4 text-left inline-block">
                  {word.meanings.map((m, i) => (
                    <li key={i} className="text-foreground leading-relaxed">
                      {word.meanings.length > 1 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium mr-1.5">
                          {i + 1}.
                        </span>
                      )}
                      {m}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* ── Chữ Hán breakdown ── */}
            {word.kanji.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <Languages size={16} className="text-rose-500" />
                  Chữ Hán ({word.kanji.length})
                </h2>
                <div className="flex flex-col divide-y divide-border/60">
                  {word.kanji.map((k) => (
                    <KanjiRow key={k.character} kanji={k} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Sentences containing the word ── */}
            <WordSentences wordId={word.id} word={word.word} />
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
      {children}
    </span>
  );
}

function splitReadings(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[、,，;；/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function KanjiRow({ kanji }: { kanji: KanjiInWord }) {
  const navigate = useNavigate();
  const on = splitReadings(kanji.onyomi).slice(0, 3);
  const kun = splitReadings(kanji.kunyomi).slice(0, 3);
  const clickable = kanji.id != null;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && navigate(`/kanji-study/kanji/${kanji.id}`)}
      className={`w-full flex items-center gap-4 py-3 px-2 text-left rounded-lg transition-colors ${
        clickable ? "hover:bg-muted/60" : "cursor-default"
      }`}
    >
      <span className="relative shrink-0">
        <span className="text-4xl font-serif text-rose-600 dark:text-rose-400 leading-none" lang="ja">
          {kanji.character}
        </span>
        {kanji.jlptLevel && kanji.jlptLevel !== "KHAC" && (
          <span className="absolute -top-1.5 -left-3 text-[10px] font-semibold text-muted-foreground">
            {kanji.jlptLevel}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        {(on.length > 0 || kun.length > 0) && (
          <span className="flex flex-wrap gap-1.5 mb-1">
            {on.map((r) => (
              <span
                key={`on-${r}`}
                className="px-1.5 py-0.5 rounded-md text-xs bg-teal-600/15 text-teal-700 dark:text-teal-300"
              >
                {r}
              </span>
            ))}
            {kun.map((r) => (
              <span
                key={`kun-${r}`}
                className="px-1.5 py-0.5 rounded-md text-xs bg-sky-600/15 text-sky-700 dark:text-sky-300"
              >
                {r}
              </span>
            ))}
          </span>
        )}
        {(kanji.hanViet || kanji.meaning) && (
          <span className="block text-sm font-medium text-foreground truncate">
            {kanji.hanViet ?? kanji.meaning}
          </span>
        )}
      </span>
    </button>
  );
}

function WordSentences({ wordId, word }: { wordId: number; word: string }) {
  const [items, setItems] = useState<KanjiSentenceItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setPage(0);
    kanjiWordApi
      .sentences(wordId, 0, SENTENCE_PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
        setTotalPages(res.totalPages ?? 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [wordId]);

  const loadMore = useCallback(async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await kanjiWordApi.sentences(wordId, next, SENTENCE_PAGE_SIZE);
      setItems((prev) => [...prev, ...(res.items ?? [])]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }, [wordId, page]);

  if (items.length === 0) return null;
  const hasMore = page + 1 < totalPages;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <MessageSquareText size={16} className="text-rose-500" />
        Câu{totalItems ? ` (${totalItems})` : ""}
      </h2>
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((s) => (
          <div key={s.id} className="py-3 first:pt-0 last:pb-0">
            <p className="text-lg leading-loose text-foreground" lang="ja">
              {renderSentence(s, word)}
            </p>
            {(s.translationVi || s.translationEn) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {s.translationVi || s.translationEn}
              </p>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
        >
          {loadingMore && <Loader2 size={14} className="animate-spin" />}
          Tải thêm ({items.length}/{totalItems})
        </button>
      )}
    </section>
  );
}

/**
 * Ruby-render a sentence, highlighting the segments that overlap an occurrence
 * of the word. Segments carry no offsets, so walk them accumulating positions
 * and compare against the word's index ranges in the raw sentence.
 */
function renderSentence(sentence: KanjiSentenceItem, word: string) {
  if (sentence.segments.length === 0) return sentence.japanese;

  const ranges: Array<[number, number]> = [];
  for (let i = sentence.japanese.indexOf(word); i >= 0; i = sentence.japanese.indexOf(word, i + 1)) {
    ranges.push([i, i + word.length]);
  }

  let offset = 0;
  return sentence.segments.map((seg, i) => {
    const start = offset;
    const end = offset + seg.t.length;
    offset = end;
    const highlight = ranges.some(([a, b]) => start < b && end > a);
    return <Segment key={i} seg={seg} highlight={highlight} />;
  });
}

function Segment({ seg, highlight }: { seg: FuriganaSegment; highlight: boolean }) {
  const cls = highlight ? "text-teal-600 dark:text-teal-400 font-semibold" : undefined;
  if (seg.r) {
    return (
      <ruby className={cls}>
        {seg.t}
        <rt className="text-[0.5em] font-normal">{seg.r}</rt>
      </ruby>
    );
  }
  return <span className={cls}>{seg.t}</span>;
}
