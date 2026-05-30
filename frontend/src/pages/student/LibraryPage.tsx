import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, tagApi } from "@/api";
import type { DeckDTO, TagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { FlashcardSettingsModal } from "@/pages/student/FlashcardSettingsModal";
import { PaginationBar } from "@/components/common/PaginationBar";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { cn } from "@/lib/utils";

const DECKS_PER_PAGE = 12;

/* Directional horizontal slide for page changes (next → slide left, prev → slide right). */
const pageSlideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -40 : 40, opacity: 0 }),
};
import {
  BookOpen, Brain, Check, ChevronDown, ChevronUp, LayoutGrid, List,
  MoreHorizontal, Plus, Search, SlidersHorizontal, Sparkles, Tag, X,
} from "lucide-react";
import { getCurrentUserId } from "@/utils/auth.utils";

type ViewMode = "list" | "grid";

/* ── Deck gradient palette (picked by deck.id % length) ── */
const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-indigo-500 to-blue-600",
  "from-sky-400 to-blue-500",
  "from-fuchsia-500 to-violet-500",
  "from-lime-400 to-green-500",
  "from-red-400 to-rose-500",
];

function getDeckGradient(id?: number) {
  if (id == null) return GRADIENTS[0];
  return GRADIENTS[id % GRADIENTS.length];
}

/* ── Shared deck-item props ── */
interface DeckItemProps {
  deck: DeckDTO;
  allTags: TagDTO[];
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onDelete: () => void;
  onTagToggle: (tagId: number) => void;
  onOpenSettings: () => void;
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function LibraryPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openDeckMenu, setOpenDeckMenu] = useState<number | null>(null);
  const [settingsDeck, setSettingsDeck] = useState<DeckDTO | null>(null);
  const [page, setPage] = useState(1); // 1-based
  const [pageDir, setPageDir] = useState(0); // 1 = next, -1 = prev (drives slide direction)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("libraryViewMode") as ViewMode) ?? "list"; } catch { return "list"; }
  });

  /* ── New tag modal ── */
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [isSavingTag, setIsSavingTag] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    tagApi.getPage({ page: 0, size: 100 }).then((r) => setTags(r.content ?? (r as any).items ?? []));
  }, []);

  /* Debounce the search box so we don't hit the API on every keystroke. */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId == null) {
      setDecks([]);
      return;
    }
    setIsLoading(true);
    deckApi
      .getPage({ page: 0, size: 100 }, debouncedSearch || undefined, { userId } as never)
      .then((r) => setDecks(r.content ?? (r as any).items ?? []))
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  /* ── Derived ── */
  const filteredDecks = useMemo(() => {
    if (selectedTagId == null) return decks;
    return decks.filter((d) => d.tagIds?.includes(selectedTagId));
  }, [decks, selectedTagId]);

  /* ── Pagination (client-side, over the filtered list) ── */
  const totalPages = Math.max(1, Math.ceil(filteredDecks.length / DECKS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedDecks = useMemo(
    () => filteredDecks.slice((safePage - 1) * DECKS_PER_PAGE, safePage * DECKS_PER_PAGE),
    [filteredDecks, safePage]
  );

  // Reset to the first page whenever the filtered set changes.
  useEffect(() => {
    setPageDir(-1);
    setPage(1);
  }, [selectedTagId, debouncedSearch]);

  const handlePageChange = (next: number) => {
    setPageDir(next >= safePage ? 1 : -1);
    setPage(next);
  };

  /* ── Actions ── */
  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem("libraryViewMode", mode); } catch {}
  };

  const nextViewMode: ViewMode = viewMode === "list" ? "grid" : "list";

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsSavingTag(true);
    try {
      const userId = getCurrentUserId();
      await tagApi.create({ name: newTagName.trim(), color: newTagColor, userId, isActive: true } as any);
      const r = await tagApi.getPage({ page: 0, size: 100 });
      setTags(r.content ?? (r as any).items ?? []);
      setNewTagName("");
      setNewTagColor("#6366f1");
      setNewTagOpen(false);
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleDeleteDeck = async (id: number) => {
    await deckApi.delete(String(id));
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setOpenDeckMenu(null);
  };

  const handleTagToggle = async (deck: DeckDTO, tagId: number) => {
    const current = new Set<number>(deck.tagIds ?? []);
    if (current.has(tagId)) current.delete(tagId);
    else current.add(tagId);
    await deckApi.update(String(deck.id), { ...deck, tagIds: Array.from(current) } as any);
    setDecks((prev) => prev.map((d) => d.id === deck.id ? { ...d, tagIds: Array.from(current) } : d));
  };

  const itemProps = (deck: DeckDTO): DeckItemProps => ({
    deck,
    allTags: tags,
    menuOpen: openDeckMenu === deck.id,
    onMenuOpen: () => setOpenDeckMenu(deck.id!),
    onMenuClose: () => setOpenDeckMenu(null),
    onDelete: () => deck.id != null && handleDeleteDeck(deck.id),
    onTagToggle: (tagId) => handleTagToggle(deck, tagId),
    onOpenSettings: () => setSettingsDeck(deck),
  });

  return (
    <MainLayout pathName={{ "/library": "Your Library" }}>
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ════════ TOP — Tags + Create ════════ */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3 border-b border-border shrink-0">
          <TagFilterBar
            tags={tags}
            selectedTagId={selectedTagId}
            onSelect={setSelectedTagId}
            onNewTag={() => setNewTagOpen(true)}
          />

          <button
            onClick={() => navigate("/create-deck")}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Sparkles className="size-3.5" />
            Create deck
          </button>
        </div>

        {/* ════════ TOOLBAR — Count + View + Search ════════ */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <p className="text-sm text-muted-foreground">
            {filteredDecks.length} {filteredDecks.length === 1 ? "deck" : "decks"}
            {selectedTagId != null && (
              <span className="ml-1">
                in <span className="font-medium text-foreground">{tags.find((t) => t.id === selectedTagId)?.name}</span>
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <button
              onClick={() => changeViewMode(nextViewMode)}
              title={`Switch to ${nextViewMode} view`}
              aria-label={`Switch to ${nextViewMode} view`}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={nextViewMode}
                  initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.85, rotate: 8 }}
                  transition={{ duration: 0.12 }}
                >
                  {nextViewMode === "grid" ? (
                    <LayoutGrid className="size-4" />
                  ) : (
                    <List className="size-4" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decks…"
                className="w-52 pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ════════ CONTENT ════════ */}
        <ScrollHintContainer axis="vertical" viewportClassName="px-6">
          {isLoading && decks.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="size-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
            </div>
          ) : filteredDecks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 gap-2"
            >
              <BookOpen className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No decks match your search"
                  : selectedTagId != null
                  ? "No decks in this tag"
                  : "No decks yet — create one!"}
              </p>
            </motion.div>
          ) : (
            /* ─── Sliding page container (direction follows next/prev) ─── */
            <AnimatePresence mode="wait" custom={pageDir} initial={false}>
              <motion.div
                key={safePage}
                custom={pageDir}
                variants={pageSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {viewMode === "list" ? (
                  /* ─── LIST VIEW (Quizlet-style) ─── */
                  <ul className="space-y-1 py-2 pb-6">
                    {pagedDecks.map((deck) => (
                      <li
                        key={deck.id}
                        className="relative"
                        style={{ zIndex: openDeckMenu === deck.id ? 40 : undefined }}
                      >
                        <DeckRow {...itemProps(deck)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  /* ─── GRID VIEW (Mazii-style) ─── */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2 pb-6">
                    {pagedDecks.map((deck) => (
                      <div
                        key={deck.id}
                        className="relative"
                        style={{ zIndex: openDeckMenu === deck.id ? 40 : undefined }}
                      >
                        <DeckCard {...itemProps(deck)} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </ScrollHintContainer>

        {/* ════════ FOOTER — fixed pagination (doesn't scroll) ════════ */}
        {!isLoading && totalPages > 1 && (
          <div className="shrink-0 border-t border-border bg-background px-6 py-2 flex justify-end">
            <PaginationBar
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredDecks.length}
            />
          </div>
        )}
      </div>

      {/* ════════ MODAL — New tag ════════ */}
      <AnimatePresence>
        {newTagOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNewTagOpen(false)}
            />
            <motion.div
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-4"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Create new tag</h2>
                  <button onClick={() => setNewTagOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Tag name</label>
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g. Grammar"
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="size-9 rounded-lg border border-input cursor-pointer bg-background"
                      />
                      <span className="text-sm text-muted-foreground font-mono">{newTagColor}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setNewTagOpen(false)}
                    className="flex-1 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isSavingTag}
                    className="flex-1 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSavingTag ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {settingsDeck?.id != null && (
        <FlashcardSettingsModal
          open={settingsDeck != null}
          deckId={settingsDeck.id}
          deckTitle={settingsDeck.title}
          onClose={() => setSettingsDeck(null)}
        />
      )}
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Tag tab pill
───────────────────────────────────────── */
function TagTab({ label, color, active, onClick }: {
  label: string; color?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────
   Tag filter bar — wraps to one row by default; expands when there are
   too many tags so they never run off-screen or force horizontal scrolling.
───────────────────────────────────────── */
function TagFilterBar({
  tags,
  selectedTagId,
  onSelect,
  onNewTag,
}: {
  tags: TagDTO[];
  selectedTagId: number | null;
  onSelect: (id: number | null) => void;
  onNewTag: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  // Detect whether the (collapsed) single row is hiding any tags.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      if (expanded) return; // while expanded we always offer "Thu gọn"
      setOverflowing(el.scrollHeight - el.clientHeight > 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tags, expanded]);

  const showToggle = expanded || overflowing;

  return (
    <div className="flex items-start gap-2 flex-1 min-w-0">
      <div
        ref={rowRef}
        className={cn(
          "flex flex-wrap items-center gap-2 min-w-0",
          expanded
            ? "max-h-40 overflow-y-auto scrollbar-none"
            : "max-h-9 overflow-hidden"
        )}
      >
        <TagTab label="All" active={selectedTagId === null} onClick={() => onSelect(null)} />
        {tags.map((tag) => (
          <TagTab
            key={tag.id}
            label={tag.name ?? "—"}
            color={tag.color}
            active={selectedTagId === tag.id}
            onClick={() => onSelect(selectedTagId === tag.id ? null : tag.id!)}
          />
        ))}
      </div>

      {/* Right-side controls stay visible regardless of collapse state */}
      <div className="shrink-0 flex items-center gap-2">
        {showToggle && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            title={expanded ? "Collapse tags" : "Show all tags"}
          >
            {expanded ? (
              <><ChevronUp className="size-3.5" /> Thu gọn</>
            ) : (
              <><ChevronDown className="size-3.5" /> Tất cả thẻ</>
            )}
          </button>
        )}
        <button
          onClick={onNewTag}
          className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          title="New tag"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Mode badge
───────────────────────────────────────── */
function ModeBadge({ mode, ghost }: { mode?: string; ghost?: boolean }) {
  if (!mode) return null;
  if (ghost) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
        {mode}
      </span>
    );
  }
  if (mode === "ANKI") {
    return (
      <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-500 border border-sky-500/20">
        Anki
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-500 border border-indigo-500/20">
      Quizlet
    </span>
  );
}

/* ─────────────────────────────────────────
   Shared overflow menu (tag picker + delete)
───────────────────────────────────────── */
function DeckOverflowMenu({
  menuOpen,
  tagPickerOpen,
  onToggleMenu,
  onClose,
  onToggleTagPicker,
  allTags,
  deckTagIds,
  onTagToggle,
  onDelete,
  onOpenSettings,
  showSettings,
  buttonCls,
}: {
  menuOpen: boolean;
  tagPickerOpen: boolean;
  onToggleMenu: () => void;
  onClose: () => void;
  onToggleTagPicker: () => void;
  allTags: TagDTO[];
  deckTagIds: Set<number>;
  onTagToggle: (id: number) => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  showSettings: boolean;
  buttonCls?: string;
}) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onToggleMenu}
        className={cn(
          "p-1.5 rounded-md transition-colors cursor-pointer",
          buttonCls ?? "text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm text-popover-foreground"
            >
              {/* Study settings — per-deck (Anki only) */}
              {showSettings && (
                <>
                  <button
                    onClick={() => { onClose(); onOpenSettings(); }}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors rounded-sm flex items-center gap-2 cursor-pointer"
                  >
                    <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                    Study settings
                  </button>
                  <div className="my-1 border-t border-border" />
                </>
              )}

              {/* Tag picker */}
              <div className="relative">
                <button
                  onClick={onToggleTagPicker}
                  className="w-full px-3 py-2 text-left hover:bg-accent transition-colors rounded-sm flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="size-3.5 text-muted-foreground" />
                    Add to tag
                  </span>
                  <Plus className="size-3 text-muted-foreground" />
                </button>

                <AnimatePresence>
                  {tagPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-full top-0 mr-1 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 z-30"
                    >
                      {allTags.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No tags yet</p>
                      ) : allTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => onTagToggle(tag.id!)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? "#888" }} />
                          <span className="flex-1 truncate">{tag.name}</span>
                          {deckTagIds.has(tag.id!) && <Check className="size-3.5 text-primary shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="my-1 border-t border-border" />
              <button
                onClick={onDelete}
                className="w-full px-3 py-2 text-left text-destructive hover:bg-accent transition-colors rounded-sm cursor-pointer"
              >
                Remove
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   LIST VIEW — Quizlet-style row
───────────────────────────────────────── */
function DeckRow({ deck, allTags, menuOpen, onMenuOpen, onMenuClose, onDelete, onTagToggle, onOpenSettings }: DeckItemProps) {
  const navigate = useNavigate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const gradient = getDeckGradient(deck.id);
  const deckTagIds = new Set<number>(deck.tagIds ?? []);

  return (
    <motion.div
      whileHover={menuOpen ? undefined : { x: 3 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "relative flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-accent group border border-transparent hover:border-border/40 transition-colors",
        menuOpen ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => navigate(deck.studyMode === "ANKI" ? `/deck/${deck.id}/anki` : `/deck/${deck.id}`)}
    >
      {/* Colored icon */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        className={cn("shrink-0 size-11 rounded-xl bg-linear-to-br flex items-center justify-center shadow-sm", gradient)}
      >
        {deck.studyMode === "ANKI"
          ? <Brain className="size-5 text-white" />
          : <BookOpen className="size-5 text-white" />}
      </motion.div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{deck.title ?? "Untitled"}</p>
          <ModeBadge mode={deck.studyMode} />
        </div>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          <p className="text-xs text-muted-foreground">{deck.totalCards ?? 0} terms</p>
          {allTags.filter((t) => t.id != null && deckTagIds.has(t.id!)).map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: t.color ?? "#888" }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className={cn("shrink-0 transition-opacity", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <DeckOverflowMenu
          menuOpen={menuOpen}
          tagPickerOpen={tagPickerOpen}
          onToggleMenu={() => { menuOpen ? onMenuClose() : onMenuOpen(); setTagPickerOpen(false); }}
          onClose={() => { onMenuClose(); setTagPickerOpen(false); }}
          onToggleTagPicker={() => setTagPickerOpen((o) => !o)}
          allTags={allTags}
          deckTagIds={deckTagIds}
          onTagToggle={onTagToggle}
          onDelete={onDelete}
          onOpenSettings={onOpenSettings}
          showSettings={deck.studyMode === "ANKI"}
        />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   GRID VIEW — Mazii-style card
───────────────────────────────────────── */
function DeckCard({ deck, allTags, menuOpen, onMenuOpen, onMenuClose, onDelete, onTagToggle, onOpenSettings }: DeckItemProps) {
  const navigate = useNavigate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const gradient = getDeckGradient(deck.id);
  const deckTagIds = new Set<number>(deck.tagIds ?? []);

  return (
    <motion.div
      whileHover={menuOpen ? undefined : { y: -5, transition: { duration: 0.18, ease: "easeOut" } }}
      whileTap={menuOpen ? undefined : { scale: 0.98 }}
      className={cn(
        "group relative rounded-2xl border border-border/60 shadow-sm hover:shadow-xl transition-shadow bg-card",
        menuOpen ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => navigate(deck.studyMode === "ANKI" ? `/deck/${deck.id}/anki` : `/deck/${deck.id}`)}
    >
      {/* ── Gradient header ── */}
      <div className={cn("relative h-24 bg-linear-to-br overflow-hidden rounded-t-2xl", gradient)}>
        {/* Decorative blobs */}
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />

        {/* Icon */}
        <div className="absolute bottom-3 left-4 size-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
          {deck.studyMode === "ANKI"
            ? <Brain className="size-5 text-white" />
            : <BookOpen className="size-5 text-white" />}
        </div>

        {/* Mode badge */}
        <div className="absolute top-2.5 left-4">
          <ModeBadge mode={deck.studyMode} ghost />
        </div>
      </div>

      {/* Menu — appears on hover. Kept OUTSIDE the overflow-hidden header
          so the open dropdown isn't clipped (and stays clickable). */}
      <div className={cn(
        "absolute top-1.5 right-1.5 z-20 transition-opacity",
        menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <DeckOverflowMenu
          menuOpen={menuOpen}
          tagPickerOpen={tagPickerOpen}
          onToggleMenu={() => { menuOpen ? onMenuClose() : onMenuOpen(); setTagPickerOpen(false); }}
          onClose={() => { onMenuClose(); setTagPickerOpen(false); }}
          onToggleTagPicker={() => setTagPickerOpen((o) => !o)}
          allTags={allTags}
          deckTagIds={deckTagIds}
          onTagToggle={onTagToggle}
          onDelete={onDelete}
          onOpenSettings={onOpenSettings}
          showSettings={deck.studyMode === "ANKI"}
          buttonCls="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        />
      </div>

      {/* ── Card body ── */}
      <div className="p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-10">
          {deck.title ?? "Untitled"}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            {deck.totalCards ?? 0} terms
          </span>
          {allTags.filter((t) => t.id != null && deckTagIds.has(t.id!)).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${t.color ?? "#888"}20`, color: t.color ?? "#888" }}
            >
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color ?? "#888" }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Hover glow effect on card bottom */}
      <div className={cn(
        "absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "ring-2 ring-inset ring-primary/10"
      )} />
    </motion.div>
  );
}
