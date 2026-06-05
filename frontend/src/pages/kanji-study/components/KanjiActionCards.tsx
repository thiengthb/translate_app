import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrushIcon, ListChecks, BookOpenText, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanjiDeckDTO } from "@/types";

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

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === deckId) ?? featuredDeck,
    [decks, deckId, featuredDeck]
  );

  const goDeck = (mode: string) => {
    if (!selectedDeck?.id) return;
    navigate(`/kanji-study/deck/${selectedDeck.id}?mode=${mode}`);
  };
  const goReview = (mode: string) => navigate(`/kanji-study/review?mode=${mode}`);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Left: study by deck ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-card p-5 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-rose-500">Học theo Deck</span>
          {decks.length > 0 && (
            <select
              value={deckId ?? ""}
              onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : undefined)}
              className="max-w-[55%] text-xs rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-rose-400"
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MethodButton icon={BrushIcon} label="Viết" disabled={!selectedDeck} onClick={() => goDeck("writing")} />
          <MethodButton icon={ListChecks} label="Trắc nghiệm" disabled={!selectedDeck} onClick={() => goDeck("quiz")} />
          <MethodButton icon={BookOpenText} label="Đọc" disabled={!selectedDeck} onClick={() => goDeck("reading")} />
        </div>

        <button
          onClick={() => selectedDeck?.id && navigate(`/kanji-study/deck/${selectedDeck.id}`)}
          disabled={!selectedDeck}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-rose-500 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed self-start"
        >
          Xem tất cả Hán tự trong deck <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Right: SRS review ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-500 to-rose-600 text-white p-5 flex flex-col">
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
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-rose-600 font-semibold py-2.5 text-sm hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}

function MethodButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof BrushIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border border-border bg-background py-3 text-xs font-medium text-foreground",
        "hover:border-rose-400 hover:text-rose-500 transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-foreground"
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
