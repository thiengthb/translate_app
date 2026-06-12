import { useEffect, useState, useCallback } from "react";
import { MessageSquareText, Loader2 } from "lucide-react";
import { kanjiVocabularyApi } from "@/api/features/kanji_study";
import type { KanjiSentenceItem, FuriganaSegment } from "@/types/features/kanji_study";

/**
 * The "Câu" (example sentences) section of the kanji detail page. Sentences come
 * from the Kanji-Study corpus by character with pre-computed furigana segments,
 * rendered as ruby. The studied kanji is highlighted in each sentence. A kanji
 * with no seeded sentences renders nothing.
 */
const PAGE_SIZE = 20;

export function KanjiSentenceSection({ character }: { character: string }) {
  const [items, setItems] = useState<KanjiSentenceItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!character) return;
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setPage(0);

    (async () => {
      try {
        const res = await kanjiVocabularyApi.sentences(character, 0, PAGE_SIZE).catch(() => null);
        if (cancelled || !res) return;
        setItems(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
        setTotalPages(res.totalPages ?? 0);
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
      const res = await kanjiVocabularyApi.sentences(character, next, PAGE_SIZE);
      setItems((prev) => [...prev, ...(res.items ?? [])]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }, [character, page]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 size={16} className="animate-spin" /> Đang tải câu ví dụ...
      </div>
    );
  }

  if (items.length === 0) return null;

  const hasMore = page + 1 < totalPages;

  return (
    <Section
      icon={<MessageSquareText size={16} className="text-rose-500" />}
      title={`Câu${totalItems ? ` (${totalItems})` : ""}`}
    >
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((s) => (
          <SentenceRow key={s.id} sentence={s} character={character} />
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
    </Section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SentenceRow({ sentence, character }: { sentence: KanjiSentenceItem; character: string }) {
  const translation = sentence.translationVi || sentence.translationEn;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-lg leading-loose text-foreground" lang="ja">
        {sentence.segments.length > 0
          ? sentence.segments.map((seg, i) => <Segment key={i} seg={seg} character={character} />)
          : sentence.japanese}
      </p>
      {translation && <p className="mt-1 text-sm text-muted-foreground">{translation}</p>}
    </div>
  );
}

function Segment({ seg, character }: { seg: FuriganaSegment; character: string }) {
  const highlight = seg.t.includes(character);
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
