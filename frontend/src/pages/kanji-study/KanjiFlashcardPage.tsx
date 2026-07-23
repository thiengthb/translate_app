import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { kanjiDeckApi, kanjiReadingApi, kanjiVocabularyApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiReadingDTO } from "@/types";
import { KanjiLayout } from "./components/KanjiLayout";
import { useDeckKanji } from "./hooks/useDeckKanji";

/**
 * Flashcard study runner (the first "HỌC" mode). Steps through the kanji of one
 * deck group (or the whole deck when no `group` is given): the front shows the
 * character, tapping flips to readings / meaning / example words. ← → walk the
 * deck, Space/Enter flips. The kanji come from the shared {@link useDeckKanji}
 * cache (no per-card storm); only the flipped card lazily fetches Hán-Việt +
 * example words.
 */
export default function KanjiFlashcardPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [params] = useSearchParams();
  const groupParam = params.get("group");
  const groupIndex = groupParam != null && groupParam !== "" ? Number(groupParam) : null;
  const navigate = useNavigate();

  const { data: deck } = useQuery({
    queryKey: ["kanji-deck", deckId],
    enabled: !!deckId,
    queryFn: () => kanjiDeckApi.getById(deckId!),
  });
  const { kanji, isLoading } = useDeckKanji(deckId);

  const cards = useMemo(
    () => (groupIndex == null ? kanji : kanji.filter((k) => k.groupIndex === groupIndex)),
    [kanji, groupIndex]
  );

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Restart when the batch changes (deck/group switch or data arrives).
  useEffect(() => {
    setIdx(0);
    setFlipped(false);
  }, [deckId, groupIndex, cards.length]);

  const total = cards.length;
  const current = cards[idx]?.kanji;
  const atLast = idx >= total - 1;

  const goPrev = () => {
    setFlipped(false);
    setIdx((i) => Math.max(i - 1, 0));
  };
  const goNext = () => {
    if (atLast) {
      navigate(`/kanji-study/deck/${deckId}`);
      return;
    }
    setFlipped(false);
    setIdx((i) => Math.min(i + 1, total - 1));
  };

  // Keyboard: Space/Enter flip, ← prev, → next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atLast, total, deckId]);

  const groupLabel = useMemo(() => {
    if (groupIndex == null) return null;
    const order: number[] = [];
    for (const k of kanji) if (!order.includes(k.groupIndex)) order.push(k.groupIndex);
    const pos = order.indexOf(groupIndex);
    return pos >= 0 ? `Nhóm ${pos + 1}` : null;
  }, [kanji, groupIndex]);

  const pct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0;

  return (
    <KanjiLayout pageScroll>
      <div className="max-w-2xl mx-auto w-full pb-10">
        <button
          onClick={() => navigate(`/kanji-study/deck/${deckId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> {deck?.title ?? "Deck"}
          {groupLabel ? ` · ${groupLabel}` : ""}
        </button>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải...</p>
        ) : total === 0 ? (
          <p className="text-muted-foreground">Nhóm này chưa có Hán tự nào.</p>
        ) : (
          <>
            {/* progress */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {idx + 1} / {total}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
            </div>

            {/* card */}
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="relative w-full min-h-[360px] rounded-3xl border border-border bg-card shadow-sm flex flex-col items-center justify-center p-6 text-center transition-colors hover:border-rose-300"
            >
              {current && (!flipped ? <CardFront kanji={current} /> : <CardBack kanji={current} />)}
              <span className="absolute bottom-3 inset-x-0 text-xs text-muted-foreground">
                Bấm để {flipped ? "ẩn" : "xem"} nghĩa (Space)
              </span>
            </button>

            {/* controls */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={goPrev}
                disabled={idx === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:border-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Trước
              </button>

              <button
                onClick={() => setFlipped((f) => !f)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <RotateCcw size={15} /> Lật thẻ
              </button>

              <button
                onClick={goNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"
              >
                {atLast ? (
                  <>
                    Hoàn thành <Check size={16} />
                  </>
                ) : (
                  <>
                    Tiếp <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </KanjiLayout>
  );
}

function CardFront({ kanji }: { kanji: KanjiDetailDTO }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-serif text-8xl leading-none text-foreground" lang="ja">
        {kanji.character}
      </span>
      {kanji.jlptLevel && kanji.jlptLevel !== "KHAC" && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {kanji.jlptLevel}
        </span>
      )}
    </div>
  );
}

function CardBack({ kanji }: { kanji: KanjiDetailDTO }) {
  const { data: readings } = useQuery({
    queryKey: ["kanji-readings", kanji.id],
    enabled: kanji.id != null,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await kanjiReadingApi.getPage(
        { page: 0, size: 50 },
        undefined,
        { kanjiId: kanji.id } as never
      );
      return (res.content ?? (res as any).items ?? []) as KanjiReadingDTO[];
    },
  });

  const { data: vocab } = useQuery({
    queryKey: ["kanji-flashcard-vocab", kanji.character],
    enabled: !!kanji.character,
    staleTime: 10 * 60 * 1000,
    queryFn: () => kanjiVocabularyApi.words(kanji.character!, 0, 4),
  });

  const hanViet = (readings ?? [])
    .filter((r) => r.readingType === "HAN_VIET")
    .map((r) => r.value)
    .filter(Boolean)
    .join("、");
  const examples = vocab?.items ?? [];

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <span className="font-serif text-5xl leading-none text-foreground" lang="ja">
        {kanji.character}
      </span>
      {hanViet && <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{hanViet}</span>}
      {kanji.meaning && <span className="text-base text-foreground">{kanji.meaning}</span>}

      <div className="mt-1 flex flex-col gap-0.5 text-sm" lang="ja">
        {kanji.onyomi && (
          <span className="text-muted-foreground">
            <span className="text-xs font-semibold text-muted-foreground/70">音 </span>
            {kanji.onyomi}
          </span>
        )}
        {kanji.kunyomi && (
          <span className="text-muted-foreground">
            <span className="text-xs font-semibold text-muted-foreground/70">訓 </span>
            {kanji.kunyomi}
          </span>
        )}
      </div>

      {examples.length > 0 && (
        <div className="mt-3 w-full border-t border-border/60 pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ví dụ</p>
          <ul className="flex flex-col gap-1">
            {examples.map((w) => (
              <li key={w.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-foreground" lang="ja">
                  {w.word}
                </span>
                {w.reading && (
                  <span className="text-xs text-muted-foreground" lang="ja">
                    【{w.reading}】
                  </span>
                )}
                {w.meaningText && (
                  <span className="text-xs text-muted-foreground truncate">{w.meaningText}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
