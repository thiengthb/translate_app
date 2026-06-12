import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  ClipboardPaste,
  Combine,
  Copy,
  Scissors,
  Square,
  X,
} from "lucide-react";
import { kanjiDeckApi, kanjiDeckOrganizeApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO } from "@/types";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { KanjiLayout } from "./components/KanjiLayout";
import { KanjiGroupSplitDialog } from "./components/KanjiGroupSplitDialog";
import { useDeckKanji, type DeckKanji } from "./hooks/useDeckKanji";
import {
  clearKanjiClipboard,
  setKanjiClipboard,
  useKanjiClipboard,
} from "./lib/kanjiClipboard";

/**
 * Browse the kanji inside a deck, organised into study-batch groups (Nhóm 1,
 * Nhóm 2…) like the mobile Kanji Study app:
 *
 * - each group can be SPLIT into smaller groups (size + repeat dialog) or
 *   MERGED (with the next group, or "gộp tất cả");
 * - clicking the kanji glyph (the circle) toggles SELECTION, clicking the rest
 *   of the card opens the detail page;
 * - the selection can be copied/cut to a clipboard and pasted into another
 *   deck — that is how users build their own decks.
 */
export default function KanjiDeckBrowsePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: deck } = useQuery({
    queryKey: ["kanji-deck", deckId],
    enabled: !!deckId,
    queryFn: () => kanjiDeckApi.getById(deckId!),
  });
  const { kanji, isLoading } = useDeckKanji(deckId);
  const clipboard = useKanjiClipboard();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [splitTarget, setSplitTarget] = useState<number | "deck" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byIndex = new Map<number, DeckKanji[]>();
    for (const item of kanji) {
      const list = byIndex.get(item.groupIndex) ?? [];
      list.push(item);
      byIndex.set(item.groupIndex, list);
    }
    return [...byIndex.entries()]
      .sort(([a], [b]) => a - b)
      .map(([groupIndex, items]) => ({ groupIndex, items }));
  }, [kanji]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["kanji-deck-items", deckId] }),
      queryClient.invalidateQueries({ queryKey: ["kanji-deck", deckId] }),
    ]);
  };

  const run = async (action: () => Promise<string | null | void>) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const note = await action();
      await refresh();
      if (note) setMessage(note);
    } catch (e: any) {
      logger.error("deck organize failed", e);
      const data = e?.response?.data;
      const detail =
        (data?.errors && Object.values(data.errors).flat().join("; ")) ||
        data?.message;
      setMessage(detail || "Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  /* ── selection ─────────────────────────────────────────────── */

  const toggleKanji = (id?: number) => {
    if (id == null) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (items: DeckKanji[]) => {
    const ids = items.map((i) => i.kanji.id).filter((id): id is number => id != null);
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const allIds = useMemo(
    () => kanji.map((i) => i.kanji.id).filter((id): id is number => id != null),
    [kanji]
  );
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  /* ── clipboard ─────────────────────────────────────────────── */

  const copySelection = (mode: "copy" | "move") => {
    const items = kanji
      .filter((i) => i.kanji.id != null && selected.has(i.kanji.id))
      .map((i) => ({ id: i.kanji.id!, character: i.kanji.character }));
    if (items.length === 0) return;
    setKanjiClipboard({
      mode,
      sourceDeckId: deckId ? Number(deckId) : null,
      sourceDeckTitle: deck?.title,
      items,
    });
    setSelected(new Set());
    setMessage(
      mode === "copy"
        ? `Đã sao chép ${items.length} kanji vào clipboard. Mở deck đích và bấm "Dán".`
        : `Đã cắt ${items.length} kanji vào clipboard. Mở deck đích và bấm "Dán" để di chuyển.`
    );
  };

  const pasteClipboard = () =>
    run(async () => {
      if (!clipboard || !deckId) return null;
      const ids = clipboard.items.map((i) => i.id);
      const result = await kanjiDeckOrganizeApi.pasteKanji(deckId, ids);
      if (
        clipboard.mode === "move" &&
        clipboard.sourceDeckId != null &&
        clipboard.sourceDeckId !== Number(deckId)
      ) {
        await kanjiDeckOrganizeApi.removeKanji(clipboard.sourceDeckId, ids);
        queryClient.invalidateQueries({
          queryKey: ["kanji-deck-items", String(clipboard.sourceDeckId)],
        });
        queryClient.invalidateQueries({
          queryKey: ["kanji-deck", String(clipboard.sourceDeckId)],
        });
      }
      clearKanjiClipboard();
      return result.skipped > 0
        ? `Đã dán ${result.added} kanji (bỏ qua ${result.skipped} kanji đã có trong deck).`
        : `Đã dán ${result.added} kanji vào deck.`;
    });

  /* ── group ops ─────────────────────────────────────────────── */

  const confirmSplit = (size: number, repeat: boolean) =>
    run(async () => {
      if (!deckId || splitTarget == null) return null;
      const result = await kanjiDeckOrganizeApi.splitGroup(deckId, {
        groupIndex: splitTarget === "deck" ? null : splitTarget,
        size,
        repeat,
      });
      setSplitTarget(null);
      return `Đã chia thành ${result.groups} nhóm.`;
    });

  const mergeAll = () =>
    run(async () => {
      if (!deckId) return null;
      await kanjiDeckOrganizeApi.mergeGroups(deckId);
      return "Đã gộp tất cả thành 1 nhóm.";
    });

  const mergeWithNext = (groupIndex: number) =>
    run(async () => {
      if (!deckId) return null;
      const result = await kanjiDeckOrganizeApi.mergeGroups(deckId, [
        groupIndex,
        groupIndex + 1,
      ]);
      return `Đã gộp nhóm ${groupIndex + 1} và ${groupIndex + 2} (còn ${result.groups} nhóm).`;
    });

  /* ── render ────────────────────────────────────────────────── */

  const splitCount =
    splitTarget === "deck"
      ? kanji.length
      : splitTarget != null
        ? (groups.find((g) => g.groupIndex === splitTarget)?.items.length ?? 0)
        : 0;

  return (
    <KanjiLayout>
      <div className="pb-28">
        <button
          onClick={() => navigate("/kanji-study/decks")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={16} /> Tất cả deck
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {deck?.title ?? "Deck"}
            </h1>
            {deck?.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{deck.description}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              {kanji.length} Hán tự · {groups.length} nhóm
            </p>
          </div>

          {kanji.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(allIds))
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-violet-400"
                title={allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              >
                {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
              </button>
              <button
                onClick={() => setSplitTarget("deck")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-violet-400 disabled:opacity-50"
              >
                <Scissors size={15} /> Chia bộ...
              </button>
              {groups.length > 1 && (
                <button
                  onClick={mergeAll}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-violet-400 disabled:opacity-50"
                >
                  <Combine size={15} /> Gộp tất cả
                </button>
              )}
            </div>
          )}
        </div>

        {message && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-4 py-2.5 text-sm text-violet-800 dark:text-violet-200">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="shrink-0 opacity-70 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        )}

        {/* clipboard banner — paste target */}
        {clipboard && clipboard.items.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 px-4 py-2.5 text-sm">
            <span className="text-teal-800 dark:text-teal-200">
              Clipboard: <b>{clipboard.items.length}</b> kanji (
              {clipboard.mode === "move" ? "di chuyển" : "sao chép"}
              {clipboard.sourceDeckTitle ? ` từ "${clipboard.sourceDeckTitle}"` : ""})
            </span>
            <span className="font-serif text-base text-teal-700 dark:text-teal-300 truncate max-w-[16rem]">
              {clipboard.items.slice(0, 10).map((i) => i.character).join(" ")}
              {clipboard.items.length > 10 ? "…" : ""}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <button
                onClick={pasteClipboard}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                <ClipboardPaste size={15} /> Dán vào deck này
              </button>
              <button
                onClick={clearKanjiClipboard}
                className="px-2 py-1.5 text-teal-700 dark:text-teal-300 hover:opacity-80"
                title="Xóa clipboard"
              >
                <X size={16} />
              </button>
            </span>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-400 mt-6">Đang tải...</p>
        ) : kanji.length === 0 ? (
          <p className="text-gray-400 mt-6">
            Deck này chưa có Hán tự nào.
            {clipboard?.items.length ? " Dán từ clipboard để thêm kanji." : ""}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {groups.map(({ groupIndex, items }, position) => {
              const isCollapsed = collapsed.has(groupIndex);
              const ids = items
                .map((i) => i.kanji.id)
                .filter((id): id is number => id != null);
              const groupAllSelected = ids.length > 0 && ids.every((id) => selected.has(id));
              return (
                <section
                  key={groupIndex}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
                >
                  <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
                    <button
                      onClick={() => toggleGroup(items)}
                      className="text-gray-400 hover:text-violet-500"
                      title={groupAllSelected ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                    >
                      {groupAllSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                    </button>
                    <span className="font-serif text-xl text-gray-700 dark:text-gray-200 w-7 text-center">
                      {items[0]?.kanji.character ?? "…"}
                    </span>
                    <button
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(groupIndex)) next.delete(groupIndex);
                          else next.add(groupIndex);
                          return next;
                        })
                      }
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        Nhóm {position + 1}
                      </span>
                      <span className="text-sm text-gray-400">– {items.length} kanji</span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "text-gray-400 transition-transform",
                          isCollapsed && "-rotate-90"
                        )}
                      />
                    </button>
                    <div className="flex items-center gap-1">
                      {items.length > 1 && (
                        <button
                          onClick={() => setSplitTarget(groupIndex)}
                          disabled={busy}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 disabled:opacity-50"
                          title="Tách nhóm này"
                        >
                          <Scissors size={16} />
                        </button>
                      )}
                      {position < groups.length - 1 && (
                        <button
                          onClick={() => mergeWithNext(groupIndex)}
                          disabled={busy}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 disabled:opacity-50"
                          title="Gộp với nhóm dưới"
                        >
                          <Combine size={16} />
                        </button>
                      )}
                    </div>
                  </header>

                  {!isCollapsed && (
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {items.map(({ itemId, kanji: k }) => (
                        <KanjiCard
                          key={itemId ?? k.id}
                          kanji={k}
                          selected={k.id != null && selected.has(k.id)}
                          onSelect={() => toggleKanji(k.id)}
                          onOpen={() =>
                            k.id && navigate(`/kanji-study/kanji/${k.id}?deck=${deckId}`)
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            <p className="text-center text-xs text-gray-400">
              Gợi ý: bấm vào chính giữa chữ Hán để chọn; bấm phần còn lại của thẻ để mở chi tiết.
            </p>
          </div>
        )}
      </div>

      {/* selection toolbar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {selected.size} đã chọn
          </span>
          <button
            onClick={() => copySelection("copy")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
          >
            <Copy size={15} /> Sao chép
          </button>
          <button
            onClick={() => copySelection("move")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
          >
            <Scissors size={15} /> Cắt
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            title="Bỏ chọn"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {splitTarget != null && (
        <KanjiGroupSplitDialog
          title={
            splitTarget === "deck"
              ? (deck?.title ?? "Cả deck")
              : `Nhóm ${groups.findIndex((g) => g.groupIndex === splitTarget) + 1}`
          }
          count={splitCount}
          wholeDeck={splitTarget === "deck"}
          onConfirm={confirmSplit}
          onClose={() => setSplitTarget(null)}
        />
      )}
    </KanjiLayout>
  );
}

/**
 * One kanji card. The center glyph circle toggles selection (like tapping the
 * kanji in the mobile app); the rest of the card opens the detail page.
 */
function KanjiCard({
  kanji,
  selected,
  onSelect,
  onOpen,
}: {
  kanji: KanjiDetailDTO;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative aspect-square rounded-2xl border bg-white dark:bg-gray-800 cursor-pointer transition flex flex-col items-center justify-center p-2",
        selected
          ? "border-teal-500 ring-2 ring-teal-400/60"
          : "border-gray-200 dark:border-gray-700 hover:border-rose-400 hover:shadow-md"
      )}
    >
      {selected && (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-teal-500 text-white p-0.5">
          <CheckSquare size={12} />
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        title="Chọn kanji này"
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full transition",
          selected
            ? "bg-teal-500 text-white"
            : "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 group-hover:text-rose-600"
        )}
      >
        <span className="text-4xl font-serif leading-none">{kanji.character ?? "…"}</span>
      </button>
      {kanji.meaning && (
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center line-clamp-1">
          {kanji.meaning}
        </span>
      )}
    </div>
  );
}
