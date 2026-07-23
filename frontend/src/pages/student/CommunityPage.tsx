import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFillPageSize } from "@/hooks/useFillPageSize";
import { DeckTitleRow, DeckStatsInline } from "@/pages/student/shared/deckCardParts";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, favoriteDeckApi } from "@/api";
import type { DeckDTO, FavoriteDeckDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  Heart,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { deckBgStyle, deckIconComponent } from "@/lib/deckVisual";
import { TemplateLibrary } from "@/pages/student/shared/TemplateLibrary";
import { EmptyState as SharedEmptyState } from "@/components/common/EmptyState";

/* ── Deck | Template segmented control (top bar) ── */
function KindTabs({ kind, onChange }: { kind: "deck" | "template"; onChange: (k: "deck" | "template") => void }) {
  const item = (value: "deck" | "template", label: string, Icon: typeof BookOpen) => (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
        kind === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
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

type Tab = "discover" | "favorites";
type ViewMode = "grid" | "list";
type SortKey = "newest" | "mostSaved" | "mostFavorited" | "mostViewed";

const DECKS_PER_PAGE = 12;

const pageSlideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -40 : 40, opacity: 0 }),
};

interface SortOption {
  key: SortKey;
  label: string;
  param: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "newest",        label: "Mới nhất",             param: "createdAt,desc",     icon: Sparkles  },
  { key: "mostSaved",     label: "Tải xuống nhiều nhất", param: "cloneCount,desc",    icon: Download  },
  { key: "mostFavorited", label: "Thích nhiều nhất",     param: "favoriteCount,desc", icon: Heart     },
  { key: "mostViewed",    label: "Xem nhiều nhất",        param: "viewCount,desc",     icon: Eye       },
];

/* ─── Tabs injected into top-bar via headerExtra ─── */
function HeaderTabs({
  tab,
  favCount,
  onChange,
}: {
  tab: Tab;
  favCount: number;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onChange("discover")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all whitespace-nowrap",
          tab === "discover"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
        )}
      >
        <Sparkles className="size-3.5" />
        Discover
      </button>
      <button
        onClick={() => onChange("favorites")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all whitespace-nowrap",
          tab === "favorites"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
        )}
      >
        <Heart className="size-3.5" />
        Favorites
        {favCount > 0 && (
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
              tab === "favorites"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {favCount}
          </span>
        )}
      </button>
    </div>
  );
}

/* ─── Datatable-style pagination (no page-size select) ─── */
function SharedPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5,
  });

  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {/* X / Y counter */}
      <span className="text-muted-foreground whitespace-nowrap tabular-nums select-none">
        <span className="font-semibold text-foreground">{currentPage}</span>
        <span className="mx-1 opacity-50">/</span>
        <span className="text-foreground">{totalPages}</span>
      </span>

      <div className="flex items-center gap-0.5">
        <TooltipWrapper content="Trang đầu">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(1)} disabled={!canPrev} aria-label="First page">
            <ChevronsLeft size={14} />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="Trang trước">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)} disabled={!canPrev} aria-label="Previous page">
            <ChevronLeft size={14} />
          </Button>
        </TooltipWrapper>

        <div className="hidden md:flex items-center gap-0.5">
          {showLeftEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
          {pages.map((p) => (
            <Button
              key={p} size="icon"
              variant={p === currentPage ? "default" : "ghost"}
              onClick={() => onPageChange(p)}
              className="h-8 w-8 tabular-nums text-xs"
            >
              {p}
            </Button>
          ))}
          {showRightEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
        </div>

        <TooltipWrapper content="Trang sau">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)} disabled={!canNext} aria-label="Next page">
            <ChevronRight size={14} />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="Trang cuối">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(totalPages)} disabled={!canNext} aria-label="Last page">
            <ChevronsRight size={14} />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function CommunityPage() {
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind: "deck" | "template" = searchParams.get("kind") === "template" ? "template" : "deck";
  const setKind = (next: "deck" | "template") => {
    const params = new URLSearchParams(searchParams);
    if (next === "deck") params.delete("kind");
    else params.set("kind", next);
    setSearchParams(params, { replace: true });
  };

  const [tab, setTab] = useState<Tab>("discover");
  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [favorites, setFavorites] = useState<FavoriteDeckDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState<number | null>(null);
  const [togglingFav, setTogglingFav] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageDir, setPageDir] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("sharedViewMode") as ViewMode) ?? "grid"; } catch { return "grid"; }
  });

  const changeViewMode = (m: ViewMode) => {
    setViewMode(m);
    try { localStorage.setItem("sharedViewMode", m); } catch {}
  };
  const nextViewMode: ViewMode = viewMode === "grid" ? "list" : "grid";

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (currentUserId == null) return;
    favoriteDeckApi.listForUser(currentUserId)
      .then((list) => setFavorites(list))
      .catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    setLoading(true);
    const sortParam = SORT_OPTIONS.find((o) => o.key === sortKey)?.param ?? "createdAt,desc";
    const filter = { visibility: "PUBLIC" };
    deckApi
      .getPage({ page: 0, size: 100, sort: sortParam }, debouncedSearch || undefined, filter as never)
      .then((pg) => setDecks(pg.content ?? []))
      .catch(() => toast.error("Không thể tải danh sách deck."))
      .finally(() => setLoading(false));
  }, [debouncedSearch, currentUserId, sortKey]);

  const favoriteByDeckId = useMemo(() => {
    const map = new Map<number, FavoriteDeckDTO>();
    favorites.forEach((f) => { if (f.deckId != null) map.set(f.deckId, f); });
    return map;
  }, [favorites]);

  const visibleDecks = useMemo(() => {
    if (tab === "favorites")
      return decks.filter((d) => d.id != null && favoriteByDeckId.has(d.id));
    return decks;
  }, [tab, decks, favoriteByDeckId]);

  // Page size fills the viewport (same behaviour as the deck library).
  const gridRef = useRef<HTMLDivElement>(null);
  const perPage = useFillPageSize(gridRef, [viewMode, tab, visibleDecks.length > 0], DECKS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(visibleDecks.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pagedDecks = useMemo(
    () => visibleDecks.slice((safePage - 1) * perPage, safePage * perPage),
    [visibleDecks, safePage, perPage]
  );

  useEffect(() => { setPageDir(-1); setPage(1); }, [tab, sortKey, debouncedSearch]);

  const handlePageChange = (next: number) => {
    setPageDir(next >= safePage ? 1 : -1);
    setPage(next);
  };

  const handleClone = useCallback(async (deck: DeckDTO) => {
    if (deck.id == null) return;
    setCloning(deck.id);
    try {
      const cloned = await deckApi.clone(deck.id);
      toast.success(`Đã lưu "${cloned.title}" vào thư viện.`);
    } catch {
      toast.error("Không thể lưu deck. Vui lòng thử lại.");
    } finally {
      setCloning(null);
    }
  }, []);

  const handleToggleFavorite = useCallback(async (deck: DeckDTO) => {
    if (deck.id == null || currentUserId == null) return;
    setTogglingFav(deck.id);
    const deckId = deck.id;
    // Keep the visible favourite count in sync with the heart, like a "like":
    // the backend adjusts deck.favoriteCount, but the card renders the value
    // from the decks array, so mirror the change here for an instant update.
    const bumpCount = (delta: number) =>
      setDecks((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, favoriteCount: Math.max(0, (d.favoriteCount ?? 0) + delta) } : d
        )
      );
    try {
      const existing = favoriteByDeckId.get(deckId);
      if (existing && existing.id != null) {
        await favoriteDeckApi.unfavorite(existing.id);
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        bumpCount(-1);
      } else {
        const created = await favoriteDeckApi.favorite(currentUserId, deckId);
        setFavorites((prev) => [...prev, created]);
        bumpCount(+1);
      }
    } catch {
      toast.error("Không thể cập nhật yêu thích.");
    } finally {
      setTogglingFav(null);
    }
  }, [currentUserId, favoriteByDeckId]);

  return (
    <MainLayout headerExtra={<KindTabs kind={kind} onChange={setKind} />} pageScroll>
      {kind === "template" ? (
        <TemplateLibrary mode="shared" />
      ) : (
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ════════ TOOLBAR — Discover/Favourites tabs · sort · search · view ════════ */}
        <div className="flex flex-wrap items-center gap-2 px-1 pt-2 pb-3 shrink-0">
          <HeaderTabs tab={tab} favCount={favorites.length} onChange={(t) => setTab(t)} />
          <div className="flex-1" />

          {/* Sort + search + view toggle */}
          <div className="flex items-center gap-2">
            <SortDropdown
              value={sortKey} open={sortOpen} onOpenChange={setSortOpen}
              onChange={(k) => { setSortKey(k); setSortOpen(false); }}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm deck…"
                className="w-44 sm:w-56 pl-9 pr-8 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
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
          </div>
        </div>

        {/* ════════ CONTENT ════════ */}
        <ScrollHintContainer axis="vertical" viewportClassName="px-1 pb-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Đang tải deck…</p>
            </div>
          ) : visibleDecks.length === 0 ? (
            <EmptyState tab={tab} hasSearch={!!debouncedSearch} onClearSearch={() => setSearchQuery("")} />
          ) : (
            <AnimatePresence mode="wait" custom={pageDir} initial={false}>
              <motion.div
                key={`${safePage}-${viewMode}`}
                custom={pageDir}
                variants={pageSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {viewMode === "list" ? (
                  <div ref={gridRef} className="space-y-1 pb-2">
                    {pagedDecks.map((deck) => (
                      <div key={deck.id}>
                        <CommunityDeckRow
                          deck={deck}
                          isOwn={deck.userId != null && deck.userId === currentUserId}
                          favorited={deck.id != null && favoriteByDeckId.has(deck.id)}
                          cloning={cloning === deck.id}
                          togglingFav={togglingFav === deck.id}
                          onPreview={() => navigate(`/deck/${deck.id}/preview`)}
                          onClone={() => handleClone(deck)}
                          onToggleFavorite={() => handleToggleFavorite(deck)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
                    {pagedDecks.map((deck) => (
                      <CommunityDeckCard
                        key={deck.id}
                        deck={deck}
                        isOwn={deck.userId != null && deck.userId === currentUserId}
                        favorited={deck.id != null && favoriteByDeckId.has(deck.id)}
                        togglingFav={togglingFav === deck.id}
                        onPreview={() => navigate(`/deck/${deck.id}/preview`)}
                        onToggleFavorite={() => handleToggleFavorite(deck)}
                      />
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
            <span className="font-semibold text-foreground">{visibleDecks.length}</span>
          </span>
          <SharedPagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
      )}
    </MainLayout>
  );
}


/* ─────────────────────────────────────────
   Sort dropdown
───────────────────────────────────────── */
function SortDropdown({
  value, open, onOpenChange, onChange,
}: {
  value: SortKey;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChange: (k: SortKey) => void;
}) {
  const active = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0]!;
  const ActiveIcon = active.icon;
  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors",
          open && "ring-2 ring-ring/50"
        )}
      >
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">{active.label}</span>
        <ActiveIcon className="size-3.5 text-muted-foreground sm:hidden" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => onOpenChange(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-border bg-popover shadow-xl py-1"
            >
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = opt.key === value;
                return (
                  <button
                    key={opt.key}
                    onClick={() => onChange(opt.key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                      isActive
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="flex-1">{opt.label}</span>
                    {isActive && <Check className="size-3.5 text-primary" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   Empty state — uses the shared EmptyState
───────────────────────────────────────── */
function EmptyState({ tab, hasSearch, onClearSearch }: { tab: Tab; hasSearch: boolean; onClearSearch: () => void }) {
  if (hasSearch) {
    return (
      <SharedEmptyState
        className="h-64"
        icon={<Search className="size-7" />}
        title="Không tìm thấy kết quả"
        description="Không có deck nào khớp với từ khóa. Thử từ khóa khác."
        action={{ label: "Xóa tìm kiếm", icon: <X className="size-4" />, onClick: onClearSearch }}
      />
    );
  }
  const isFav = tab === "favorites";
  return (
    <SharedEmptyState
      className="h-64"
      icon={isFav ? <Heart className="size-7" /> : <Users className="size-7" />}
      title={isFav ? "Chưa có deck yêu thích" : "Chưa có deck công khai"}
      description={
        isFav
          ? "Duyệt tab Discover và nhấn ♥ để lưu deck bạn thích."
          : "Công khai một deck từ thư viện của bạn để chia sẻ với mọi người."
      }
    />
  );
}

/* ─────────────────────────────────────────
   Deck row — list view
───────────────────────────────────────── */
function CommunityDeckRow({
  deck, isOwn, favorited, cloning, togglingFav,
  onPreview, onClone, onToggleFavorite,
}: {
  deck: DeckDTO;
  isOwn: boolean;
  favorited: boolean;
  cloning: boolean;
  togglingFav: boolean;
  onPreview: () => void;
  onClone: () => void;
  onToggleFavorite: () => void;
}) {
  const gradStyle = deckBgStyle(deck);
  const DeckIcon  = deckIconComponent(deck);

  return (
    <div
      onClick={onPreview}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md"
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm" style={gradStyle}>
        <DeckIcon className="size-5 text-white" />
      </div>

      {/* Info — title + visibility, then card count + New/Learning/Review (like My Library) */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <DeckTitleRow deck={deck} />
        <div className="flex min-w-0 items-center gap-2.5 text-xs text-muted-foreground">
          <span className="shrink-0">{deck.totalCards ?? 0} thẻ</span>
          <DeckStatsInline deck={deck} />
          {(deck.favoriteCount ?? 0) > 0 && (
            <span className="flex shrink-0 items-center gap-1"><Heart className="size-3 text-rose-400" />{deck.favoriteCount}</span>
          )}
          {(deck.cloneCount ?? 0) > 0 && (
            <span className="flex shrink-0 items-center gap-1"><Download className="size-3 text-blue-400" />{deck.cloneCount}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isOwn && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            disabled={togglingFav}
            title={favorited ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            className={cn(
              "size-8 rounded-lg flex items-center justify-center border transition-all",
              favorited
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-500"
                : "border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200",
              togglingFav && "opacity-50 cursor-wait"
            )}
          >
            <Heart className={cn("size-3.5", favorited && "fill-current")} />
          </button>
        )}
        {isOwn ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          >
            <Eye className="size-3.5" /> Xem
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClone(); }}
            disabled={cloning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {cloning ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {cloning ? "Đang lưu…" : "Lưu"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Deck card — grid view
───────────────────────────────────────── */
function CommunityDeckCard({
  deck, isOwn, favorited, togglingFav, onPreview, onToggleFavorite,
}: {
  deck: DeckDTO;
  isOwn: boolean;
  favorited: boolean;
  togglingFav: boolean;
  onPreview: () => void;
  onToggleFavorite: () => void;
}) {
  const gradStyle = deckBgStyle(deck);
  const DeckIcon  = deckIconComponent(deck);

  return (
    <motion.div
      onClick={onPreview}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-border/60 bg-card shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-lg"
    >
      {/* Gradient banner */}
      <div className="relative h-24 shrink-0 overflow-hidden rounded-t-xl" style={gradStyle}>
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />

        {/* Owner — red ribbon across the top-left corner, "Của bạn" on hover */}
        {isOwn && (
          <TooltipWrapper content="Của bạn">
            <span className="absolute -left-8 top-3 z-20 h-5 w-28 -rotate-45 cursor-default bg-red-600 shadow-md" />
          </TooltipWrapper>
        )}

        <div className="absolute bottom-3 left-4 size-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <DeckIcon className="size-5 text-white" />
        </div>

        {!isOwn && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            disabled={togglingFav}
            title={favorited ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            className={cn(
              "absolute top-2.5 right-2.5 size-7 rounded-lg backdrop-blur-sm flex items-center justify-center transition-all",
              favorited
                ? "bg-rose-500 text-white shadow-md hover:bg-rose-600"
                : "bg-white/20 text-white hover:bg-white/35",
              togglingFav && "opacity-60 cursor-wait"
            )}
          >
            <Heart className={cn("size-3.5 transition-transform", favorited && "fill-current scale-110")} />
          </button>
        )}
      </div>

      {/* Body — title + visibility, then card count + views / favorites / downloads */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <DeckTitleRow deck={deck} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium">{deck.totalCards ?? 0} thẻ</span>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="flex items-center gap-1" title="Lượt xem"><Eye className="size-3" />{deck.viewCount ?? 0}</span>
            <span className="flex items-center gap-1" title="Yêu thích"><Heart className="size-3 text-rose-400" />{deck.favoriteCount ?? 0}</span>
            <span className="flex items-center gap-1" title="Lượt tải"><Download className="size-3 text-blue-400" />{deck.cloneCount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Brighten ring on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-inset ring-primary/10 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}
