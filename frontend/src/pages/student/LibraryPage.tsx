import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, tagApi } from "@/api";
import type { DeckDTO, TagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { FlashcardSettingsModal } from "@/pages/student/FlashcardSettingsModal";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
  BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ChevronUp, LayoutGrid, List,
  MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Sparkles, Tag, X,
} from "lucide-react";
import { getCurrentUserId } from "@/utils/auth.utils";

const DECKS_PER_PAGE = 12;

type ViewMode = "list" | "grid";

const pageSlideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -40 : 40, opacity: 0 }),
};

import { deckBgStyle, deckIconComponent } from "@/lib/deckVisual";

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
  onEdit: () => void;
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
  const [page, setPage] = useState(1);
  const [pageDir, setPageDir] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("libraryViewMode") as ViewMode) ?? "grid"; } catch { return "grid"; }
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
    onEdit: () => deck.id != null && navigate(`/deck/${deck.id}/edit`),
  });

  return (
    <MainLayout>
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ════════ TOP — Tags + Search + Create ════════ */}
        <div className="flex items-start gap-2 px-1 pt-2 pb-3 shrink-0">
          <TagFilterBar
            tags={tags}
            selectedTagId={selectedTagId}
            onSelect={setSelectedTagId}
            onNewTag={() => setNewTagOpen(true)}
          />

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm deck…"
              className="w-44 sm:w-52 pl-9 pr-8 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <button
            onClick={() => changeViewMode(nextViewMode)}
            title={`Chuyển sang ${nextViewMode === "grid" ? "lưới" : "danh sách"}`}
            className="shrink-0 inline-flex size-[34px] items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={nextViewMode}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
              >
                {nextViewMode === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </button>

          <button
            onClick={() => navigate("/create-deck")}
            className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Sparkles className="size-3.5" />
            Create deck
          </button>
        </div>

        {/* ════════ CONTENT ════════ */}
        <ScrollHintContainer axis="vertical" viewportClassName="px-1">
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
                  ? "Không tìm thấy deck phù hợp"
                  : selectedTagId != null
                  ? "Không có deck nào trong tag này"
                  : "Chưa có deck — hãy tạo một cái!"}
              </p>
            </motion.div>
          ) : (
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
                  <ul className="space-y-1 py-2 pb-4">
                    {pagedDecks.map((deck) => (
                      <li key={deck.id} className="relative" style={{ zIndex: openDeckMenu === deck.id ? 40 : undefined }}>
                        <DeckRow {...itemProps(deck)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-2 pb-4">
                    {pagedDecks.map((deck) => (
                      <div key={deck.id} className="relative" style={{ zIndex: openDeckMenu === deck.id ? 40 : undefined }}>
                        <DeckCard {...itemProps(deck)} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </ScrollHintContainer>

        {/* ════════ FOOTER — total (left) + pagination (right) ════════ */}
        <div className="shrink-0 border-t border-border bg-background px-2 py-1.5 flex items-center justify-between min-h-[44px]">
          <span className="text-xs text-muted-foreground tabular-nums">
            Tổng:{" "}
            <span className="font-semibold text-foreground">{filteredDecks.length}</span>
          </span>
          <LibraryPagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
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
   Datatable-style pagination (no page-size select)
───────────────────────────────────────── */
function LibraryPagination({
  currentPage, totalPages, onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage, totalPages, paginationItemsToDisplay: 5,
  });

  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground whitespace-nowrap tabular-nums select-none">
        <span className="font-semibold text-foreground">{currentPage}</span>
        <span className="mx-1 opacity-50">/</span>
        <span className="text-foreground">{totalPages}</span>
      </span>
      <div className="flex items-center gap-0.5">
        <TooltipWrapper content="Trang đầu">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(1)} disabled={!canPrev}>
            <ChevronsLeft size={14} />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="Trang trước">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)} disabled={!canPrev}>
            <ChevronLeft size={14} />
          </Button>
        </TooltipWrapper>
        <div className="hidden md:flex items-center gap-0.5">
          {showLeftEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
          {pages.map((p) => (
            <Button key={p} size="icon"
              variant={p === currentPage ? "default" : "ghost"}
              onClick={() => onPageChange(p)}
              className="h-8 w-8 tabular-nums text-xs">
              {p}
            </Button>
          ))}
          {showRightEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
        </div>
        <TooltipWrapper content="Trang sau">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)} disabled={!canNext}>
            <ChevronRight size={14} />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="Trang cuối">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(totalPages)} disabled={!canNext}>
            <ChevronsRight size={14} />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
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
  onEdit,
  showSettings,
  buttonCls,
  tagFlyout = false,
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
  onEdit: () => void;
  showSettings: boolean;
  buttonCls?: string;
  /** List view → tag list flies out to the side; card view → expands inline. */
  tagFlyout?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const tagBtnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const MENU_W = 176; // w-44

  // Position the portal dropdown under the button, clamped to the viewport.
  useLayoutEffect(() => {
    if (!menuOpen || !btnRef.current) {
      setPos(null);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.min(window.innerWidth - MENU_W - 8, Math.max(8, r.right - MENU_W));
    setPos({ top: r.bottom + 6, left });
  }, [menuOpen]);

  // Flyout tag panel (list view): sit to the LEFT of the menu, aligned with the row.
  useLayoutEffect(() => {
    if (!tagFlyout || !tagPickerOpen || !tagBtnRef.current || !pos) {
      setFlyoutPos(null);
      return;
    }
    const r = tagBtnRef.current.getBoundingClientRect();
    let left = pos.left - MENU_W - 6;          // prefer left side
    if (left < 8) left = pos.left + MENU_W + 6; // flip right if no room
    setFlyoutPos({ top: r.top, left });
  }, [tagFlyout, tagPickerOpen, pos]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={onToggleMenu}
        className={cn(
          "p-1.5 rounded-md transition-colors cursor-pointer",
          buttonCls ?? "text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      {/* Rendered in a portal at <body> so it floats above the sidebar / any
          overflow-clipped ancestor, regardless of where the card sits. */}
      {menuOpen && pos && createPortal(
        <div onClick={(e) => e.stopPropagation()}>
          <div className="fixed inset-0 z-90" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-91 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm text-popover-foreground"
          >
              {/* Edit deck */}
              <button
                onClick={() => { onClose(); onEdit(); }}
                className="w-full px-3 py-2 text-left hover:bg-accent transition-colors rounded-sm flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="size-3.5 text-muted-foreground" />
                Chỉnh sửa
              </button>
              <div className="my-1 border-t border-border" />

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

              {/* Tag picker.
                  List view (tagFlyout) → side flyout to the left.
                  Card view → expands inline so it never clips on edge cards. */}
              <div>
                <button
                  ref={tagBtnRef}
                  onClick={onToggleTagPicker}
                  className="w-full px-3 py-2 text-left hover:bg-accent transition-colors rounded-sm flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="size-3.5 text-muted-foreground" />
                    Add to tag
                  </span>
                  {tagFlyout ? (
                    <Plus className="size-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", tagPickerOpen && "rotate-180")} />
                  )}
                </button>

                {/* Inline expansion (card view) */}
                {!tagFlyout && (
                  <AnimatePresence initial={false}>
                    {tagPickerOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="max-h-44 overflow-y-auto border-y border-border/60 bg-muted/30">
                          {allTags.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">No tags yet</p>
                          ) : allTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => onTagToggle(tag.id!)}
                              className="w-full pl-7 pr-3 py-1.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? "#888" }} />
                              <span className="flex-1 truncate">{tag.name}</span>
                              {deckTagIds.has(tag.id!) && <Check className="size-3.5 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              <div className="my-1 border-t border-border" />
              <button
                onClick={onDelete}
                className="w-full px-3 py-2 text-left text-destructive hover:bg-accent transition-colors rounded-sm cursor-pointer"
              >
                Remove
              </button>
          </motion.div>

          {/* Side flyout tag panel (list view) */}
          {tagFlyout && tagPickerOpen && flyoutPos && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
              style={{ top: flyoutPos.top, left: flyoutPos.left }}
              className="fixed z-92 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm text-popover-foreground max-h-64 overflow-y-auto"
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
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   LIST VIEW — Quizlet-style row
───────────────────────────────────────── */
function DeckRow({ deck, allTags, menuOpen, onMenuOpen, onMenuClose, onDelete, onTagToggle, onOpenSettings, onEdit }: DeckItemProps) {
  const navigate = useNavigate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const gradStyle  = deckBgStyle(deck);
  const DeckIcon   = deckIconComponent(deck);
  const deckTagIds = new Set<number>(deck.tagIds ?? []);

  return (
    <motion.div
      whileHover={menuOpen ? undefined : { x: 3 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "relative flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-accent group border border-transparent hover:border-border/40 transition-colors",
        menuOpen ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => navigate(deck.studyMode === "ANKI" ? `/deck/${deck.id}/anki` : `/deck/${deck.id}`)}
    >
      <div
        className="shrink-0 size-11 rounded-lg flex items-center justify-center shadow-sm"
        style={gradStyle}
      >
        <DeckIcon className="size-5 text-white" />
      </div>

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
          onEdit={onEdit}
          showSettings={deck.studyMode === "ANKI"}
          tagFlyout
        />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   GRID VIEW — Mazii-style card
───────────────────────────────────────── */
function DeckCard({ deck, allTags, menuOpen, onMenuOpen, onMenuClose, onDelete, onTagToggle, onOpenSettings, onEdit }: DeckItemProps) {
  const navigate = useNavigate();
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const gradStyle  = deckBgStyle(deck);
  const DeckIcon   = deckIconComponent(deck);
  const deckTagIds = new Set<number>(deck.tagIds ?? []);

  return (
    <motion.div
      whileHover={menuOpen ? undefined : { y: -4, transition: { duration: 0.16, ease: "easeOut" } }}
      whileTap={menuOpen ? undefined : { scale: 0.98 }}
      className={cn(
        // NOTE: no `overflow-hidden` here — it would clip the overflow menu's
        // dropdown + the "Add to tag" submenu (which opens leftward). The
        // gradient header clips its own decorative blobs instead.
        "group relative rounded-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-border transition-all bg-card flex flex-col",
        menuOpen ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => navigate(deck.studyMode === "ANKI" ? `/deck/${deck.id}/anki` : `/deck/${deck.id}`)}
    >
      {/* Gradient header */}
      <div className="relative h-24 overflow-hidden rounded-t-xl shrink-0" style={gradStyle}>
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />

        <div className="absolute bottom-3 left-4 size-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <DeckIcon className="size-5 text-white" />
        </div>

        <div className="absolute top-2.5 left-4">
          <ModeBadge mode={deck.studyMode} ghost />
        </div>
      </div>

      {/* Menu — outside overflow-hidden so dropdown isn't clipped */}
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
          onEdit={onEdit}
          showSettings={deck.studyMode === "ANKI"}
          buttonCls="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        />
      </div>

      {/* Card body */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">
          {deck.title ?? "Untitled"}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            {deck.totalCards ?? 0} thẻ
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

      <div className={cn(
        "absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "ring-2 ring-inset ring-primary/10"
      )} />
    </motion.div>
  );
}
