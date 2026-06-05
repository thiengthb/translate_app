import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, tagApi } from "@/api";
import type { DeckDTO, TagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { FlashcardSettingsModal } from "@/pages/student/FlashcardSettingsModal";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { DataPagination } from "@/components/common/DataPagination";
import { cn } from "@/lib/utils";
import {
  BookOpen, Check, Layers, LayoutGrid, List,
  MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Sparkles, Tag, Trash2, X,
} from "lucide-react";
import { getCurrentUserId } from "@/utils/auth.utils";
import { COLOR_PRESETS } from "@/lib/color-presets";
import { TemplateLibrary } from "@/pages/student/shared/TemplateLibrary";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { toast } from "sonner";
import { useFillPageSize } from "@/hooks/useFillPageSize";
import { DeckTitleRow, DeckStatsInline, VisibilityBadge } from "@/pages/student/shared/deckCardParts";
import { LibrarySortMenu, type LibrarySortOption } from "@/pages/student/shared/LibrarySortMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ActionButton from "@/components/datatable/common/ActionButton";

/* ── Deck | Template segmented control (rendered in the top bar) ── */
function LibraryKindTabs({ tab, onChange }: { tab: "deck" | "template"; onChange: (t: "deck" | "template") => void }) {
  const item = (value: "deck" | "template", label: string, Icon: typeof BookOpen) => (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
        tab === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5">
      {item("deck", "Deck", BookOpen)}
      {item("template", "Mẫu thẻ", Layers)}
    </div>
  );
}

const DECKS_PER_PAGE = 12;

/* ── Deck sort ("filter") options — backed by real deck fields ── */
type DeckSortKey = "newest" | "recent" | "most_viewed" | "name" | "oldest";

const DECK_SORT_OPTIONS: LibrarySortOption<DeckSortKey>[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "recent", label: "Truy cập gần đây" },
  { value: "most_viewed", label: "Xem nhiều nhất" },
  { value: "name", label: "Tên (A → Z)" },
  { value: "oldest", label: "Cũ nhất" },
];

function compareDecks(a: DeckDTO, b: DeckDTO, key: DeckSortKey): number {
  switch (key) {
    case "oldest":      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    case "recent":      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    case "most_viewed": return (b.viewCount ?? 0) - (a.viewCount ?? 0);
    case "name":        return (a.title ?? "").localeCompare(b.title ?? "");
    case "newest":
    default:            return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  }
}

/** Fixed tag colour palette — the app's preset swatches (no free colour picker). */
const TAG_COLORS = COLOR_PRESETS.map((p) => p.swatch);

/**
 * Sentinel tag colour meaning "follow the app's accent". Tags stored with this
 * value (or no colour) render with the live `var(--primary)`, so they re-tint
 * when the user changes the app's color preset. It's the default for new tags.
 */
const APP_TAG_COLOR = "app";
/** Resolve a stored tag colour to a solid CSS colour (sentinel → app accent). */
const tagColorSolid = (c?: string | null) => (!c || c === APP_TAG_COLOR ? "var(--primary)" : c);
/** Translucent fill for chip/pill backgrounds — works for both hex and var(). */
const tagColorSoft = (c?: string | null) => `color-mix(in srgb, ${tagColorSolid(c)} 14%, transparent)`;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: "deck" | "template" = searchParams.get("tab") === "template" ? "template" : "deck";
  const setTab = (next: "deck" | "template") => {
    const params = new URLSearchParams(searchParams);
    if (next === "deck") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
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
  const [sortBy, setSortBy] = useState<DeckSortKey>(() => {
    try { return (localStorage.getItem("librarySortBy") as DeckSortKey) ?? "newest"; } catch { return "newest"; }
  });
  const changeSortBy = (key: DeckSortKey) => {
    setSortBy(key);
    try { localStorage.setItem("librarySortBy", key); } catch { /* ignore */ }
  };

  /* ── New tag modal ── */
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(APP_TAG_COLOR);
  const [isSavingTag, setIsSavingTag] = useState(false);

  /* ── Delete-tag confirm ── */
  const [tagToDelete, setTagToDelete] = useState<TagDTO | null>(null);
  const [isDeletingTag, setIsDeletingTag] = useState(false);

  /* ── Fetch — only the current user's own tags ── */
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId == null) { setTags([]); return; }
    tagApi
      .getPage({ page: 0, size: 100 }, undefined, { userId } as never)
      .then((r) => setTags(r.content ?? (r as any).items ?? []));
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

  // Sort ("filter") applied on top of the tag filter.
  const sortedDecks = useMemo(
    () => [...filteredDecks].sort((a, b) => compareDecks(a, b, sortBy)),
    [filteredDecks, sortBy]
  );

  /* ── Pagination (client-side) — page size fills the viewport ── */
  const gridRef = useRef<HTMLDivElement>(null);
  const perPage = useFillPageSize(gridRef, [viewMode, sortedDecks.length > 0], DECKS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(sortedDecks.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pagedDecks = useMemo(
    () => sortedDecks.slice((safePage - 1) * perPage, safePage * perPage),
    [sortedDecks, safePage, perPage]
  );

  // Reset to the first page whenever the filtered/sorted set changes.
  useEffect(() => {
    setPageDir(-1);
    setPage(1);
  }, [selectedTagId, debouncedSearch, sortBy]);

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
      const r = await tagApi.getPage({ page: 0, size: 100 }, undefined, { userId } as never);
      setTags(r.content ?? (r as any).items ?? []);
      setNewTagName("");
      setNewTagColor(APP_TAG_COLOR);
      setNewTagOpen(false);
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleDeleteTag = async () => {
    const id = tagToDelete?.id;
    if (id == null) return;
    setIsDeletingTag(true);
    try {
      await tagApi.delete(String(id));
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (selectedTagId === id) setSelectedTagId(null);
      setTagToDelete(null);
      toast.success("Đã xóa tag.");
    } catch {
      toast.error("Không thể xóa tag.");
    } finally {
      setIsDeletingTag(false);
    }
  };

  const handleDeleteDeck = async (id: number) => {
    await deckApi.delete(String(id));
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setOpenDeckMenu(null);
  };

  const handleTagToggle = async (deck: DeckDTO, tagId: number) => {
    const prevTagIds = deck.tagIds ?? [];
    const next = new Set<number>(prevTagIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    const nextTagIds = Array.from(next);

    // Optimistic: reflect the toggle in the UI immediately so the modal's
    // checkbox responds on click instead of waiting for the network round-trip.
    setDecks((prev) => prev.map((d) => d.id === deck.id ? { ...d, tagIds: nextTagIds } : d));

    try {
      // Send ONLY tagIds — never the whole deck. The update mapper ignores null
      // properties, so other fields are preserved, and omitting the stale client
      // `version` lets Hibernate use the freshly-loaded entity's version. Sending
      // the full deck would carry a stale @Version and make quick successive
      // toggles fail with an optimistic-locking conflict.
      const saved = await deckApi.update(String(deck.id), { tagIds: nextTagIds } as any);
      // Reconcile with the canonical server response.
      setDecks((prev) => prev.map((d) => d.id === deck.id ? { ...d, ...saved } : d));
    } catch {
      // Roll back on failure and let the user know.
      setDecks((prev) => prev.map((d) => d.id === deck.id ? { ...d, tagIds: prevTagIds } : d));
      toast.error("Không thể cập nhật tag.");
    }
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
    <MainLayout headerExtra={<LibraryKindTabs tab={tab} onChange={setTab} />}>
      {tab === "template" ? (
        <TemplateLibrary mode="owned" />
      ) : (
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ════════ TOP — All + new tag · Sort · View · Search · Create ════════ */}
        <div className="flex items-center gap-2 px-1 pt-2 pb-3 shrink-0">
          {/* "All" filter + new tag — the tag chips live on the row below */}
          <TagTab label="All" active={selectedTagId === null} onClick={() => setSelectedTagId(null)} />
          <button
            onClick={() => setNewTagOpen(true)}
            title="Tạo tag mới"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
          <div className="flex-1" />

          {/* Sort ("filter") */}
          <LibrarySortMenu value={sortBy} options={DECK_SORT_OPTIONS} onChange={changeSortBy} />

          {/* View mode toggle */}
          <TooltipWrapper content={`Chuyển sang dạng ${nextViewMode === "grid" ? "lưới" : "danh sách"}`}>
            <button
              onClick={() => changeViewMode(nextViewMode)}
              aria-label="Đổi kiểu hiển thị"
              className="shrink-0 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
          </TooltipWrapper>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm deck…"
              className="w-44 sm:w-52 h-9 pl-9 pr-8 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
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

          {/* Create — icon-only, like ProTable */}
          <ActionButton
            onClick={() => navigate("/create-deck")}
            tooltip="Tạo deck mới"
            variant="default"
            icon={<Plus size={16} />}
          />
        </div>

        {/* ════════ TAG FILTER — one row, scrolls horizontally when long ════════ */}
        {tags.length > 0 && (
          <div className="shrink-0 px-1 pb-2">
            {/* pt-2/pr-2 give the top-right delete badge room so the horizontal
                viewport (overflow-y-hidden) doesn't clip it. */}
            <ScrollHintContainer axis="horizontal" viewportClassName="pb-0.5">
              <div className="flex w-max items-center gap-2 pt-2 pr-2">
                {tags.map((tag) => (
                  <TagTab
                    key={tag.id}
                    label={tag.name ?? "—"}
                    color={tag.color}
                    active={selectedTagId === tag.id}
                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id!)}
                    onDelete={() => setTagToDelete(tag)}
                  />
                ))}
              </div>
            </ScrollHintContainer>
          </div>
        )}

        {/* ════════ CONTENT ════════ */}
        <ScrollHintContainer axis="vertical" viewportClassName="px-1">
          {isLoading && decks.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="size-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
            </div>
          ) : filteredDecks.length === 0 ? (
            <EmptyState
              className="h-40"
              icon={<BookOpen className="size-7" />}
              title="Không có deck"
              action={{ label: "Tạo deck", icon: <Sparkles className="size-4" />, onClick: () => navigate("/create-deck") }}
            />
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
                  <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 py-2 pb-4">
                    {pagedDecks.map((deck) => (
                      <div key={deck.id} className="relative" style={{ zIndex: openDeckMenu === deck.id ? 40 : undefined }}>
                        <DeckRow {...itemProps(deck)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-2 pb-4">
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
          <DataPagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
      )}

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
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                {/* Header — title (left) · live preview + close (right) */}
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Tag className="size-4" />
                    </span>
                    <h2 className="text-base font-semibold text-foreground">Create new tag</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Live preview pill — mirrors the tag tabs */}
                    <span
                      className="inline-flex h-7 max-w-[150px] items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium"
                      style={{ backgroundColor: tagColorSoft(newTagColor), color: tagColorSolid(newTagColor) }}
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tagColorSolid(newTagColor) }} />
                      <span className="truncate">{newTagName.trim() || "Tag name"}</span>
                    </span>
                    <button
                      onClick={() => setNewTagOpen(false)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-3.5 px-5 py-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tag name</label>
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g. Grammar"
                      maxLength={50}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    />
                  </div>

                  {/* Color palette */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
                    <div className="grid grid-cols-10 gap-2">
                      {/* App color — follows the current theme accent; the default. */}
                      <button
                        type="button"
                        title="Theo màu app — đổi theo chủ đề hiện tại"
                        onClick={() => setNewTagColor(APP_TAG_COLOR)}
                        className={cn(
                          "relative flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                          newTagColor === APP_TAG_COLOR
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110"
                            : "ring-1 ring-black/5 dark:ring-white/10"
                        )}
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        <Sparkles className="size-3.5 text-primary-foreground" />
                      </button>
                      {TAG_COLORS.map((c) => {
                        const active = newTagColor.toLowerCase() === c.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            title={c}
                            onClick={() => setNewTagColor(c)}
                            className={cn(
                              "relative flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                              active ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : "ring-1 ring-black/5 dark:ring-white/10"
                            )}
                            style={{ backgroundColor: c }}
                          >
                            {active && <Check className="size-3.5 text-white drop-shadow-sm" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="flex gap-2 border-t border-border px-5 py-3.5">
                  <button
                    onClick={() => setNewTagOpen(false)}
                    className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isSavingTag}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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

      {/* ════════ MODAL — Confirm delete tag ════════ */}
      <ConfirmDialog
        open={tagToDelete != null}
        title="Xóa tag"
        description={`Bạn có chắc muốn xóa tag "${tagToDelete?.name ?? ""}"? Các deck đang gắn tag này sẽ không còn được lọc theo nó.`}
        confirmLabel="Xóa tag"
        cancelLabel="Hủy"
        loading={isDeletingTag}
        onConfirm={handleDeleteTag}
        onCancel={() => setTagToDelete(null)}
      />
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Tag tab pill
───────────────────────────────────────── */
const TAG_LABEL_MAX = 10;

function TagTab({ label, color, active, onClick, onDelete }: {
  label: string; color?: string; active: boolean; onClick: () => void;
  /** When provided, a delete badge appears at the tag's top-right corner. */
  onDelete?: () => void;
}) {
  const truncated = label.length > TAG_LABEL_MAX;
  const shown = truncated ? `${label.slice(0, TAG_LABEL_MAX)}…` : label;
  const button = (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex h-8 items-center gap-1.5 px-3.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: tagColorSolid(color) }} />}
      {shown}
    </button>
  );
  // Long names are truncated on the bar — reveal the full name on hover.
  const pill = truncated ? <TooltipWrapper content={label}>{button}</TooltipWrapper> : button;

  if (!onDelete) return pill;

  // The delete badge sits in the top-right corner and reveals on hover/focus.
  return (
    <div className="group/tag relative shrink-0">
      {pill}
      <button
        type="button"
        aria-label={`Xóa tag ${label}`}
        title="Xóa tag"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={cn(
          "absolute -right-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full",
          "border-2 border-background bg-destructive text-destructive-foreground shadow-sm",
          // Reveal with a gentle scale + fade on hover/focus; pop slightly on hover.
          "scale-75 opacity-0 transition-all duration-150 hover:scale-110 hover:bg-destructive/90",
          "group-hover/tag:scale-100 group-hover/tag:opacity-100",
          "focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
        )}
      >
        <X className="size-2.5" strokeWidth={3} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   Shared overflow menu (edit · settings · add-to-tag · remove)
   "Add to tag" opens a dedicated modal (TagPickerModal) instead of an
   inline/flyout list, so it never clips on edge cards and reads the same
   in both list and grid views.
───────────────────────────────────────── */
function DeckOverflowMenu({
  menuOpen,
  onToggleMenu,
  onClose,
  onOpenTagModal,
  onDelete,
  onOpenSettings,
  onEdit,
  showSettings,
  buttonCls,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onClose: () => void;
  onOpenTagModal: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  onEdit: () => void;
  showSettings: boolean;
  buttonCls?: string;
}) {
  // Controlled Radix dropdown — same primitives as the page's sort/filter menu
  // (LibrarySortMenu) so the two read identically. The parent owns which deck's
  // menu is open (single-open + z-index boost), so map open-state through it.
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => (open ? onToggleMenu() : onClose())}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Tùy chọn deck"
            className={cn(
              "p-1.5 rounded-md transition-colors cursor-pointer",
              buttonCls ?? "text-muted-foreground hover:text-foreground hover:bg-background data-[state=open]:bg-accent data-[state=open]:text-foreground"
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tùy chọn deck
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Chỉnh sửa
          </DropdownMenuItem>

          {showSettings && (
            <DropdownMenuItem onSelect={onOpenSettings}>
              <SlidersHorizontal />
              Cài đặt học
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onSelect={onOpenTagModal}>
            <Tag />
            Gắn tag
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            Xóa deck
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ─────────────────────────────────────────
   Tag picker modal — choose which tags a deck belongs to.
   Toggling persists immediately (onTagToggle); the check state reflects the
   deck's live tagIds, so it updates as the parent re-renders.
───────────────────────────────────────── */
function TagPickerModal({
  open,
  onClose,
  deck,
  allTags,
  deckTagIds,
  onTagToggle,
}: {
  open: boolean;
  onClose: () => void;
  deck: DeckDTO;
  allTags: TagDTO[];
  deckTagIds: Set<number>;
  onTagToggle: (tagId: number) => void;
}) {
  // Esc closes the modal.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-[100] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tag className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-tight text-foreground">Gắn tag</h2>
                    <p className="truncate text-xs text-muted-foreground">{deck.title ?? "Deck"}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Đóng"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Tag list */}
              <div className="max-h-72 overflow-y-auto p-2">
                {allTags.length === 0 ? (
                  <div className="px-3 py-10 text-center">
                    <Tag className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Chưa có tag nào.</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">Tạo tag ở thanh lọc phía trên.</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {allTags.map((tag) => {
                      const checked = tag.id != null && deckTagIds.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => tag.id != null && onTagToggle(tag.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                            checked && "bg-accent/40"
                          )}
                        >
                          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: tagColorSolid(tag.color) }} />
                          <span className="flex-1 truncate text-foreground">{tag.name}</span>
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                            )}
                          >
                            {checked && <Check className="size-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end border-t border-border bg-muted/30 px-5 py-3">
                <button
                  onClick={onClose}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Xong
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ─────────────────────────────────────────
   LIST VIEW — Quizlet-style row
───────────────────────────────────────── */
function DeckRow({ deck, allTags, menuOpen, onMenuOpen, onMenuClose, onDelete, onTagToggle, onOpenSettings, onEdit }: DeckItemProps) {
  const navigate = useNavigate();
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const gradStyle  = deckBgStyle(deck);
  const DeckIcon   = deckIconComponent(deck);
  const deckTagIds = new Set<number>(deck.tagIds ?? []);
  const deckTags   = allTags.filter((t) => t.id != null && deckTagIds.has(t.id));

  return (
    <div
      className={cn(
        // Horizontal bar — same info + tooltips as the card. Hover only
        // brightens (border + shadow), no slide/bounce.
        "group relative flex h-full items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md",
        menuOpen ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => navigate(`/deck/${deck.id}`)}
    >
      {/* Public/private — pushed onto the top-right corner, overlapping the border */}
      <VisibilityBadge
        deck={deck}
        className="absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card shadow-sm"
      />

      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm" style={gradStyle}>
        <DeckIcon className="size-5 text-white" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <DeckTitleRow deck={deck} showVisibility={false} />
        {/* Card count · New/Learning/Review · tags — all on one line */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-xs text-muted-foreground">{deck.totalCards ?? 0} thẻ</span>
          <DeckStatsInline deck={deck} />
          <div className="min-w-0 flex-1 flex"><DeckTags tags={deckTags} /></div>
        </div>
      </div>

      <div className={cn("shrink-0 transition-opacity", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <DeckOverflowMenu
          menuOpen={menuOpen}
          onToggleMenu={() => { menuOpen ? onMenuClose() : onMenuOpen(); }}
          onClose={onMenuClose}
          onOpenTagModal={() => setTagModalOpen(true)}
          onDelete={onDelete}
          onOpenSettings={onOpenSettings}
          onEdit={onEdit}
          showSettings={true}
        />
      </div>

      <TagPickerModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        deck={deck}
        allTags={allTags}
        deckTagIds={deckTagIds}
        onTagToggle={onTagToggle}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   GRID VIEW — Mazii-style card
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   Tags on a single line — overflow collapses into a "+N" chip whose tooltip
   lists the hidden tags. Width is measured; fit is estimated from name length.
───────────────────────────────────────── */
const TAG_CHIP_MAX = 10;

function TagChip({ tag }: { tag: TagDTO }) {
  const name = tag.name ?? "—";
  const truncated = name.length > TAG_CHIP_MAX;
  const shown = truncated ? `${name.slice(0, TAG_CHIP_MAX)}…` : name;
  const chip = (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: tagColorSoft(tag.color), color: tagColorSolid(tag.color) }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tagColorSolid(tag.color) }} />
      {shown}
    </span>
  );
  return truncated ? <TooltipWrapper content={name}>{chip}</TooltipWrapper> : chip;
}

function OneLineTags({ tags }: { tags: TagDTO[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const GAP = 6;
  const PLUS = 34; // reserved width for the "+N" chip
  // Chips cap names at TAG_CHIP_MAX chars (+ ellipsis), so estimate off that.
  const estW = (t: TagDTO) => Math.min(t.name?.length ?? 1, TAG_CHIP_MAX + 1) * 6.2 + 26;

  let visibleCount = tags.length;
  if (width > 0) {
    let used = 0;
    visibleCount = 0;
    for (let i = 0; i < tags.length; i++) {
      const tw = estW(tags[i]) + (i > 0 ? GAP : 0);
      const reserve = i < tags.length - 1 ? PLUS + GAP : 0;
      if (used + tw + reserve <= width) { used += tw; visibleCount++; } else break;
    }
    if (visibleCount === 0) visibleCount = 1; // always show at least one
  }

  const visible = tags.slice(0, visibleCount);
  const hidden = tags.slice(visibleCount);

  return (
    <div ref={ref} className="flex items-center gap-1.5 overflow-hidden">
      {visible.map((t) => <TagChip key={t.id} tag={t} />)}
      {hidden.length > 0 && (
        <TooltipWrapper content={hidden.map((t) => t.name ?? "—").join(", ")}>
          <span className="shrink-0 cursor-default rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            +{hidden.length}
          </span>
        </TooltipWrapper>
      )}
    </div>
  );
}

/* ── One-line tags, or a tag-height dashed pill with a single dot ("Chưa có tag" on hover) ── */
function DeckTags({ tags }: { tags: TagDTO[] }) {
  if (tags.length === 0) {
    return (
      <TooltipWrapper content="Chưa có tag">
        <span className="inline-flex h-5 shrink-0 cursor-default items-center justify-center rounded-full border border-dashed border-border px-2.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        </span>
      </TooltipWrapper>
    );
  }
  return <OneLineTags tags={tags} />;
}

function DeckCard({ deck, allTags, menuOpen, onMenuOpen, onMenuClose, onDelete, onTagToggle, onOpenSettings, onEdit }: DeckItemProps) {
  const navigate = useNavigate();
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const gradStyle  = deckBgStyle(deck);
  const DeckIcon   = deckIconComponent(deck);
  const deckTagIds = new Set<number>(deck.tagIds ?? []);
  const deckTags   = allTags.filter((t) => t.id != null && deckTagIds.has(t.id));

  return (
    <motion.div
      className={cn(
        // NOTE: no `overflow-hidden` here — it would clip the overflow menu's
        // dropdown + the "Add to tag" submenu (which opens leftward). The
        // gradient header clips its own decorative blobs instead.
        // Hover only brightens (shadow + border + ring) — no lift/bounce.
        // h-full → fill the stretched grid cell so every card is the same height.
        "group relative flex h-full flex-col rounded-xl border border-border/60 bg-card shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-lg",
        menuOpen ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => navigate(`/deck/${deck.id}`)}
    >
      {/* Gradient header */}
      <div className="relative h-24 overflow-hidden rounded-t-xl shrink-0" style={gradStyle}>
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />

        <div className="absolute bottom-3 left-4 size-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <DeckIcon className="size-5 text-white" />
        </div>
      </div>

      {/* Menu — outside overflow-hidden so dropdown isn't clipped */}
      <div className={cn(
        "absolute top-1.5 right-1.5 z-20 transition-opacity",
        menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <DeckOverflowMenu
          menuOpen={menuOpen}
          onToggleMenu={() => { menuOpen ? onMenuClose() : onMenuOpen(); }}
          onClose={onMenuClose}
          onOpenTagModal={() => setTagModalOpen(true)}
          onDelete={onDelete}
          onOpenSettings={onOpenSettings}
          onEdit={onEdit}
          showSettings={true}
          buttonCls="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        />
      </div>

      <TagPickerModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        deck={deck}
        allTags={allTags}
        deckTagIds={deckTagIds}
        onTagToggle={onTagToggle}
      />

      {/* Card body */}
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <DeckTitleRow deck={deck} />
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground">{deck.totalCards ?? 0} thẻ</span>
          <div className="ml-auto"><DeckStatsInline deck={deck} /></div>
        </div>
        <div className="mt-auto">
          <DeckTags tags={deckTags} />
        </div>
      </div>

      <div className={cn(
        "absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "ring-2 ring-inset ring-primary/10"
      )} />
    </motion.div>
  );
}
