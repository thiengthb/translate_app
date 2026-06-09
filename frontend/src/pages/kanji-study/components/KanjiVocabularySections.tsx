import { useEffect, useState, useCallback } from "react";
import { Volume2, Sparkles, Library, Loader2 } from "lucide-react";
import { kanjiVocabularyApi } from "@/api/features/kanji_study";
import type { KanjiVocabWord, KanjiVocabReadingGroup } from "@/types/features/kanji_study";

/**
 * The word-driven sections of the kanji detail page — pronunciation examples
 * grouped by reading ("Ví dụ phát âm"), recommended words ("Từ được đề cử"),
 * and the full paginated vocabulary list ("Từ vựng"). All data is pulled from
 * the dictionary corpus by the kanji character, so a kanji with no seeded
 * vocabulary simply renders nothing.
 */
const PAGE_SIZE = 20;
const RECOMMENDED_COUNT = 6;

export function KanjiVocabularySections({ character }: { character: string }) {
  const [groups, setGroups] = useState<KanjiVocabReadingGroup[]>([]);
  const [words, setWords] = useState<KanjiVocabWord[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!character) return;
    let cancelled = false;
    setLoading(true);
    setWords([]);
    setGroups([]);
    setPage(0);

    (async () => {
      try {
        const [wordPage, readingGroups] = await Promise.all([
          kanjiVocabularyApi.words(character, 0, PAGE_SIZE).catch(() => null),
          kanjiVocabularyApi.readingExamples(character).catch(() => [] as KanjiVocabReadingGroup[]),
        ]);
        if (cancelled) return;
        if (wordPage) {
          setWords(wordPage.items ?? []);
          setTotalItems(wordPage.totalItems ?? 0);
          setTotalPages(wordPage.totalPages ?? 0);
        }
        setGroups(readingGroups ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [character]);

  const loadMore = useCallback(async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const wordPage = await kanjiVocabularyApi.words(character, next, PAGE_SIZE);
      setWords((prev) => [...prev, ...(wordPage.items ?? [])]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }, [character, page]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 size={16} className="animate-spin" /> Đang tải từ vựng...
      </div>
    );
  }

  // No vocabulary seeded for this kanji — render nothing rather than empty shells.
  if (words.length === 0 && groups.length === 0) return null;

  const recommended = words.slice(0, RECOMMENDED_COUNT);
  const hasMore = page + 1 < totalPages;

  return (
    <>
      {groups.length > 0 && (
        <Section icon={<Volume2 size={16} className="text-rose-500" />} title="Ví dụ phát âm">
          <div className="flex flex-col gap-4">
            {groups.map((g, i) => (
              <div key={`${g.readingType}-${g.reading ?? "other"}-${i}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ReadingBadge group={g} />
                  <span className="text-xs text-muted-foreground">{g.totalCount} từ vựng</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {g.words.map((w) => (
                    <WordRow key={w.id} word={w} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {recommended.length > 0 && (
        <Section icon={<Sparkles size={16} className="text-rose-500" />} title="Từ được đề cử">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {recommended.map((w) => (
              <WordRow key={w.id} word={w} />
            ))}
          </div>
        </Section>
      )}

      {words.length > 0 && (
        <Section
          icon={<Library size={16} className="text-rose-500" />}
          title={`Từ vựng${totalItems ? ` (${totalItems})` : ""}`}
        >
          <div className="flex flex-col divide-y divide-border/60">
            {words.map((w) => (
              <div key={w.id} className="py-2 first:pt-0 last:pb-0">
                <WordRow word={w} />
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
              Tải thêm ({words.length}/{totalItems})
            </button>
          )}
        </Section>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function ReadingBadge({ group }: { group: KanjiVocabReadingGroup }) {
  const styles: Record<string, string> = {
    ON: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    KUN: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    OTHER: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-sm font-semibold ${styles[group.readingType] ?? styles.OTHER}`}>
      {group.reading ?? "Khác"}
    </span>
  );
}

function WordRow({ word, compact = false }: { word: KanjiVocabWord; compact?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <div className="min-w-0">
        <span className="font-medium text-foreground">{word.word}</span>
        {word.reading && (
          <span className="ml-2 text-xs text-muted-foreground">【{word.reading}】</span>
        )}
        {word.meaningText && (
          <span className={`text-muted-foreground ${compact ? "ml-2 text-sm" : "block text-sm"}`}>
            {word.meaningText}
          </span>
        )}
      </div>
      {!compact && word.levelCode && word.levelCode !== "KHAC" && (
        <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
          {word.levelCode}
        </span>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
