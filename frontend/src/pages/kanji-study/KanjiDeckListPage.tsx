import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Layers, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { kanjiDeckApi } from "@/api/features/kanji_study";
import type { KanjiDeckDTO } from "@/types";
import { logger } from "@/lib/logger";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { KanjiLayout } from "./components/KanjiLayout";
import { useKanjiClipboard } from "./lib/kanjiClipboard";
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
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<KanjiDeckDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const clipboard = useKanjiClipboard();

  const handleDelete = async () => {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    try {
      await kanjiDeckApi.delete(String(deleteTarget.id));
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      logger.error("delete deck failed", e);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    kanjiDeckApi
      .getPage({ page: 0, size: 100 }, search)
      .then((r) => setDecks(r.content ?? (r as any).items ?? []))
      .catch(() => setDecks([]))
      .finally(() => setIsLoading(false));
  }, [search, reloadKey]);

  const { systemDecks, myDecks } = useMemo(() => {
    return {
      systemDecks: decks.filter((d) => d.isSystem),
      myDecks: decks.filter((d) => !d.isSystem),
    };
  }, [decks]);

  const renderDeck = (deck: KanjiDeckDTO) => (
    <div
      key={deck.id}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/kanji-study/deck/${deck.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/kanji-study/deck/${deck.id}`)}
      className="group relative text-left rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className={cn("h-24 bg-gradient-to-br relative", gradientFor(deck.id))}>
        <BookOpen className="absolute right-3 bottom-3 text-white/80" size={28} />
        {deck.jlptLevel && (
          <span className="absolute left-3 top-3 text-xs font-semibold bg-white/25 text-white px-2 py-0.5 rounded-full">
            {deck.jlptLevel}
          </span>
        )}
        {/* Only the user's own decks can be deleted (system decks are read-only). */}
        {!deck.isSystem && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(deck);
            }}
            title="Xóa deck"
            className="absolute right-2 top-2 grid place-items-center h-8 w-8 rounded-full bg-black/20 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition"
          >
            <Trash2 size={16} />
          </button>
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
    </div>
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

        {clipboard && clipboard.items.length > 0 && (
          <div className="mb-6 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 px-4 py-2.5 text-sm text-teal-800 dark:text-teal-200">
            Clipboard có <b>{clipboard.items.length}</b> kanji — mở một deck của bạn (hoặc tạo
            deck mới) rồi bấm "Dán vào deck này".
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-400">Đang tải...</p>
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
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Deck của tôi</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myDecks.map(renderDeck)}
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition flex flex-col items-center justify-center gap-2 min-h-[176px]"
                >
                  <Plus size={28} />
                  <span className="font-semibold text-sm">Tạo deck mới</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDeckDialog
          onClose={() => setShowCreate(false)}
          onCreated={(deck) => {
            setShowCreate(false);
            setReloadKey((k) => k + 1);
            if (deck.id) navigate(`/kanji-study/deck/${deck.id}`);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Xóa deck"
        description={`Xóa deck "${deleteTarget?.title ?? ""}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa deck"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </KanjiLayout>
  );
}

/** Minimal create-own-deck dialog: title + description. */
function CreateDeckDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (deck: KanjiDeckDTO) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const deck = await kanjiDeckApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        isActive: true,
      } as KanjiDeckDTO);
      onCreated(deck);
    } catch (e) {
      logger.error("create deck failed", e);
      setError("Không tạo được deck. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tạo deck mới</h3>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Tên deck"
          className="mt-4 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả (tùy chọn)"
          rows={2}
          className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            HỦY
          </button>
          <button
            disabled={!title.trim() || busy}
            onClick={submit}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? "Đang tạo..." : "Tạo deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
