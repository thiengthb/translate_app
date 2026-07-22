import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrushIcon, ChevronRight, GraduationCap, ListChecks, Zap } from "lucide-react";
import type { KanjiDeckDTO } from "@/types";
import { useDeckItems } from "../hooks/useDeckKanji";
import { KanjiStudyOptionsDialog, type KanjiStudyMode } from "./KanjiStudyOptionsDialog";

interface Props {
  decks: KanjiDeckDTO[];
  featuredDeck?: KanjiDeckDTO;
  dueCount: number;
}

/**
 * The two primary CTAs on the dashboard:
 *  - left  → jump into a chosen deck with a study method (write / quiz / read)
 *  - right → an SRS review session over kanji that are due (quiz / write)
 */
export function KanjiActionCards({ decks, featuredDeck, dueCount }: Props) {
  const navigate = useNavigate();
  const [deckId, setDeckId] = useState<number | undefined>(featuredDeck?.id);
  const [showStudy, setShowStudy] = useState(false);
  const [groupIndex, setGroupIndex] = useState<number | null>(null);

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === deckId) ?? featuredDeck,
    [decks, deckId, featuredDeck]
  );

  // Study is batch-based: derive the deck's groups (Nhóm) so the user picks one.
  const { data: deckItems } = useDeckItems(selectedDeck?.id != null ? String(selectedDeck.id) : undefined);
  const groups = useMemo(() => {
    const order: number[] = [];
    const count = new Map<number, number>();
    for (const it of deckItems ?? []) {
      const g = it.groupIndex ?? 0;
      if (!order.includes(g)) order.push(g);
      count.set(g, (count.get(g) ?? 0) + 1);
    }
    return order.map((g, pos) => ({ groupIndex: g, pos, count: count.get(g) ?? 0 }));
  }, [deckItems]);

  // Default to the first group; keep the choice if it still exists after a switch.
  useEffect(() => {
    if (groups.length === 0) {
      setGroupIndex(null);
      return;
    }
    setGroupIndex((prev) =>
      prev != null && groups.some((g) => g.groupIndex === prev) ? prev : groups[0].groupIndex
    );
  }, [groups]);

  const selectedGroup = groups.find((g) => g.groupIndex === groupIndex);
  const groupLabel = selectedGroup ? `Nhóm ${selectedGroup.pos + 1}` : null;

  const startStudy = (mode: KanjiStudyMode) => {
    setShowStudy(false);
    if (!selectedDeck?.id || groupIndex == null) return;
    if (mode === "flashcard") {
      navigate(`/kanji-study/deck/${selectedDeck.id}/flashcard?group=${groupIndex}`);
    } else if (mode === "quiz") {
      navigate(`/kanji-study/deck/${selectedDeck.id}/quiz?group=${groupIndex}`);
    } else if (mode === "writing") {
      navigate(`/kanji-study/deck/${selectedDeck.id}/writing?group=${groupIndex}`);
    }
  };
  const goReview = (mode: string) => navigate(`/kanji-study/review?mode=${mode}`);

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Left: study by deck ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card p-5 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Học theo Deck</span>
          {decks.length > 0 && (
            <select
              value={deckId ?? ""}
              onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : undefined)}
              className="max-w-[55%] text-xs rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title ?? "Deck"}
                </option>
              ))}
            </select>
          )}
        </div>

        <h3 className="mt-2 text-xl font-bold text-foreground line-clamp-1">
          {selectedDeck?.title ?? "Chưa chọn deck"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {selectedDeck ? `${selectedDeck.totalKanji ?? 0} Hán tự` : "Thêm deck trong Content → Decks"}
        </p>

        {groups.length > 0 && (
          <select
            value={groupIndex ?? ""}
            onChange={(e) => setGroupIndex(e.target.value !== "" ? Number(e.target.value) : null)}
            className="mt-4 w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Chọn nhóm để học"
          >
            {groups.map((g) => (
              <option key={g.groupIndex} value={g.groupIndex}>
                Nhóm {g.pos + 1} · {g.count} Hán tự
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => setShowStudy(true)}
          disabled={!selectedDeck || groupIndex == null}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GraduationCap size={18} /> Học
        </button>

        <button
          onClick={() => selectedDeck?.id && navigate(`/kanji-study/deck/${selectedDeck.id}`)}
          disabled={!selectedDeck}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed self-start"
        >
          Xem tất cả Hán tự trong deck <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Right: SRS review ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 text-primary-foreground p-5 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Ôn tập SRS</span>
          <Zap size={18} className="text-white/90" />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold leading-none">{dueCount}</span>
          <span className="text-sm text-white/80">Hán tự cần ôn</span>
        </div>
        <p className="text-sm text-white/80 mt-1">
          {dueCount > 0 ? "Ôn lại theo lịch lặp lại ngắt quãng để nhớ lâu." : "Tuyệt vời! Không có Hán tự nào tới hạn."}
        </p>

        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => goReview("quiz")}
            disabled={dueCount === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-primary font-semibold py-2.5 text-sm hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ListChecks size={16} /> Trắc nghiệm
          </button>
          <button
            onClick={() => goReview("writing")}
            disabled={dueCount === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 text-white font-semibold py-2.5 text-sm hover:bg-white/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BrushIcon size={16} /> Viết
          </button>
        </div>
      </div>
    </div>

    {showStudy && selectedDeck && (
      <KanjiStudyOptionsDialog
        title={`${selectedDeck.title ?? "Deck"}${groupLabel ? ` - ${groupLabel}` : ""}`}
        deckId={selectedDeck.id}
        groupIndex={groupIndex}
        onSelect={startStudy}
        onClose={() => setShowStudy(false)}
      />
    )}
    </>
  );
}
