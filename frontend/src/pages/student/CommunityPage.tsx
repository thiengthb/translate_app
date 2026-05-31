import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  Heart,
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

  const totalPages = Math.max(1, Math.ceil(visibleDecks.length / DECKS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedDecks = useMemo(
    () => visibleDecks.slice((safePage - 1) * DECKS_PER_PAGE, safePage * DECKS_PER_PAGE),
    [visibleDecks, safePage]
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
    try {
      const existing = favoriteByDeckId.get(deck.id);
      if (existing && existing.id != null) {
        await favoriteDeckApi.unfavorite(existing.id);
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      } else {
        const created = await favoriteDeckApi.favorite(currentUserId, deck.id);
        setFavorites((prev) => [...prev, created]);
      }
    } catch {
      toast.error("Không thể cập nhật yêu thích.");
    } finally {
      setTogglingFav(null);
    }
  }, [currentUserId, favoriteByDeckId]);

  return (
    <MainLayout
      headerExtra={
        <HeaderTabs tab={tab} favCount={favorites.length} onChange={(t) => setTab(t)} />
      }
    >
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ════════ TOOLBAR ════════ */}
        <div className="flex flex-wrap items-center gap-2 px-1 pt-2 pb-3 shrink-0">
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
            <EmptyState tab={tab} hasSearch={!!debouncedSearch} />
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
                  <ul className="space-y-1 pb-2">
                    {pagedDecks.map((deck) => (
                      <li key={deck.id}>
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
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
                    {pagedDecks.map((deck) => (
                      <CommunityDeckCard
                        key={deck.id}
                        deck={deck}
                        isOwn={deck.userId != null && deck.userId === currentUserId}
                        favorited={deck.id != null && favoriteByDeckId.has(deck.id)}
                        cloning={cloning === deck.id}
                        togglingFav={togglingFav === deck.id}
                        onPreview={() => navigate(`/deck/${deck.id}/preview`)}
                        onClone={() => handleClone(deck)}
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
   Empty state
───────────────────────────────────────── */
function EmptyState({ tab, hasSearch }: { tab: Tab; hasSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-64 gap-4 text-center py-12"
    >
      <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        {tab === "favorites"
          ? <Heart className="size-7 text-muted-foreground/50" />
          : <Users className="size-7 text-muted-foreground/50" />}
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-medium text-foreground">
          {tab === "favorites"
            ? "Chưa có deck yêu thích"
            : hasSearch ? "Không tìm thấy kết quả" : "Chưa có deck công khai"}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {tab === "favorites"
            ? "Duyệt tab Discover và nhấn ♥ để lưu deck bạn thích."
            : hasSearch
              ? "Thử từ khóa khác hoặc xóa bộ lọc."
              : "Công khai một deck từ thư viện của bạn để chia sẻ với mọi người."}
        </p>
      </div>
    </motion.div>
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
    <motion.div
      whileHover={{ x: 3, transition: { duration: 0.1 } }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-accent border border-transparent hover:border-border/40 transition-colors cursor-pointer group"
      onClick={onPreview}
    >
      {/* Icon */}
      <div className="shrink-0 size-11 rounded-lg flex items-center justify-center shadow-sm" style={gradStyle}>
        <DeckIcon className="size-4 text-white" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{deck.title ?? "Untitled"}</p>
          {isOwn && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              <Check className="size-3" /> Của bạn
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>{deck.totalCards ?? 0} thẻ</span>
          {(deck.favoriteCount ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Heart className="size-3 text-rose-400" />{deck.favoriteCount}</span>
          )}
          {(deck.cloneCount ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Download className="size-3 text-blue-400" />{deck.cloneCount}</span>
          )}
          {deck.sourceLanguage && deck.targetLanguage && (
            <span className="font-mono uppercase text-[10px] tracking-wide">{deck.sourceLanguage}→{deck.targetLanguage}</span>
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
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Deck card — grid view
───────────────────────────────────────── */
function CommunityDeckCard({
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
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.16, ease: "easeOut" } }}
      className="group relative rounded-xl overflow-hidden border border-border/60 shadow-sm hover:shadow-lg hover:border-border transition-all bg-card cursor-pointer flex flex-col"
      onClick={onPreview}
    >
      {/* Gradient banner */}
      <div className="relative h-24 overflow-hidden shrink-0" style={gradStyle}>
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />

        <div className="absolute bottom-3 left-4 size-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <DeckIcon className="size-5 text-white" />
        </div>

        {isOwn ? (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
            <Check className="size-3" />
            Của bạn
          </span>
        ) : (
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

      {/* Body */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {deck.title ?? "Untitled"}
          </p>
          {deck.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {deck.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{deck.totalCards ?? 0} thẻ</span>
          <div className="flex items-center gap-2.5">
            {(deck.favoriteCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="size-3 text-rose-400" />
                {deck.favoriteCount}
              </span>
            )}
            {(deck.cloneCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Download className="size-3 text-blue-400" />
                {deck.cloneCount}
              </span>
            )}
            {deck.sourceLanguage && deck.targetLanguage && (
              <span className="font-mono uppercase text-[10px] tracking-wide">
                {deck.sourceLanguage}→{deck.targetLanguage}
              </span>
            )}
          </div>
        </div>

        {isOwn ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Eye className="size-3.5" />
            Xem deck của bạn
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClone(); }}
            disabled={cloning}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cloning ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {cloning ? "Đang lưu…" : "Lưu vào thư viện"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
