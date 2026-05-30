import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, favoriteDeckApi } from "@/api";
import type { DeckDTO, FavoriteDeckDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { PaginationBar } from "@/components/common/PaginationBar";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  Check,
  Compass,
  Download,
  Eye,
  Heart,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";

/* ── Color palette for deck card gradients (pick by deck.id % len) ── */
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
const gradientFor = (id?: number) =>
  GRADIENTS[(id ?? 0) % GRADIENTS.length] ?? GRADIENTS[0];

type Tab = "discover" | "favorites";
type ModeFilter = "ALL" | "QUIZLET" | "ANKI";
type SortKey = "newest" | "mostSaved" | "mostFavorited" | "mostViewed";

const DECKS_PER_PAGE = 12;

/* Directional horizontal slide for page changes (next → slide left, prev → slide right). */
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
  { key: "newest",         label: "Mới nhất",            param: "createdAt,desc",    icon: Sparkles },
  { key: "mostSaved",      label: "Tải xuống nhiều nhất", param: "cloneCount,desc",   icon: Download },
  { key: "mostFavorited",  label: "Thích nhiều nhất",     param: "favoriteCount,desc", icon: Heart },
  { key: "mostViewed",     label: "Xem nhiều nhất",       param: "viewCount,desc",    icon: Eye },
];

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
  const [mode, setMode] = useState<ModeFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1); // 1-based
  const [pageDir, setPageDir] = useState(0); // 1 = next, -1 = prev (drives slide direction)

  /* Debounce search input */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  /* Load user's favorites once on mount */
  useEffect(() => {
    if (currentUserId == null) return;
    favoriteDeckApi
      .listForUser(currentUserId)
      .then((list) => setFavorites(list))
      .catch(() => {
        // non-fatal — favorites list just stays empty
      });
  }, [currentUserId]);

  /* Load public decks (excluding ones owned by current user) */
  useEffect(() => {
    setLoading(true);
    const sortParam =
      SORT_OPTIONS.find((o) => o.key === sortKey)?.param ?? "createdAt,desc";
    const filter: { visibility: string; studyMode?: "QUIZLET" | "ANKI" } = {
      visibility: "PUBLIC",
    };
    if (mode !== "ALL") filter.studyMode = mode;
    deckApi
      .getPage(
        { page: 0, size: 100, sort: sortParam },
        debouncedSearch || undefined,
        filter as never
      )
      .then((page) => {
        // Show every public deck — including the current user's own. Owned decks
        // are marked with a "Của bạn" badge (and a preview action instead of a
        // clone button) on the card. Previously own decks were filtered out,
        // which left admins — who own the seeded public decks — with an empty
        // Community.
        setDecks(page.content ?? []);
      })
      .catch(() => toast.error("Failed to load community decks."))
      .finally(() => setLoading(false));
  }, [debouncedSearch, currentUserId, mode, sortKey]);

  /* Map deckId → favorite entry (for fast lookup) */
  const favoriteByDeckId = useMemo(() => {
    const map = new Map<number, FavoriteDeckDTO>();
    favorites.forEach((f) => {
      if (f.deckId != null) map.set(f.deckId, f);
    });
    return map;
  }, [favorites]);

  /* Compute visible deck list per tab */
  const visibleDecks = useMemo(() => {
    if (tab === "favorites") {
      return decks.filter((d) => d.id != null && favoriteByDeckId.has(d.id));
    }
    return decks;
  }, [tab, decks, favoriteByDeckId]);

  /* Pagination (client-side, over the visible list) */
  const totalPages = Math.max(1, Math.ceil(visibleDecks.length / DECKS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedDecks = useMemo(
    () => visibleDecks.slice((safePage - 1) * DECKS_PER_PAGE, safePage * DECKS_PER_PAGE),
    [visibleDecks, safePage]
  );

  // Reset to the first page whenever the visible set changes.
  useEffect(() => {
    setPageDir(-1);
    setPage(1);
  }, [tab, mode, sortKey, debouncedSearch]);

  const handlePageChange = (next: number) => {
    setPageDir(next >= safePage ? 1 : -1);
    setPage(next);
  };

  /* Actions */
  const handleClone = useCallback(
    async (deck: DeckDTO) => {
      if (deck.id == null) return;
      setCloning(deck.id);
      try {
        const cloned = await deckApi.clone(deck.id);
        toast.success(`Saved "${cloned.title}" to your library.`);
      } catch {
        toast.error("Failed to save deck. Please try again.");
      } finally {
        setCloning(null);
      }
    },
    []
  );

  const handleToggleFavorite = useCallback(
    async (deck: DeckDTO) => {
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
        toast.error("Failed to update favorite.");
      } finally {
        setTogglingFav(null);
      }
    },
    [currentUserId, favoriteByDeckId]
  );

  /* Render */
  return (
    <MainLayout pathName={{ "/community": "Community" }}>
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">

        {/* ════════ HEADER ════════ */}
        <div className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Compass className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Community
              </h1>
              <p className="text-xs text-muted-foreground">
                Discover public decks shared by other learners. Save the ones you like.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            <TabButton
              icon={<Sparkles className="size-3.5" />}
              label="Discover"
              active={tab === "discover"}
              onClick={() => setTab("discover")}
            />
            <TabButton
              icon={<Heart className="size-3.5" />}
              label="Favorites"
              count={favorites.length}
              active={tab === "favorites"}
              onClick={() => setTab("favorites")}
            />
          </div>
        </div>

        {/* ════════ TOOLBAR ════════ */}
        <div className="flex flex-col gap-3 px-6 py-3 shrink-0 border-b border-border/50">
          {/* Mode filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <ModePill
              label="Tất cả"
              icon={<Sparkles className="size-3.5" />}
              active={mode === "ALL"}
              onClick={() => setMode("ALL")}
            />
            <ModePill
              label="Quizlet"
              icon={<BookOpen className="size-3.5" />}
              active={mode === "QUIZLET"}
              onClick={() => setMode("QUIZLET")}
              accent="violet"
            />
            <ModePill
              label="Anki"
              icon={<Brain className="size-3.5" />}
              active={mode === "ANKI"}
              onClick={() => setMode("ANKI")}
              accent="sky"
            />
          </div>

          {/* Count + sort + search row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : `${visibleDecks.length} ${visibleDecks.length === 1 ? "deck" : "decks"}`}
            </p>

            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <SortDropdown
                value={sortKey}
                open={sortOpen}
                onOpenChange={setSortOpen}
                onChange={(k) => {
                  setSortKey(k);
                  setSortOpen(false);
                }}
              />

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm…"
                  className="w-56 pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
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
        </div>

        {/* ════════ CONTENT ════════ */}
        <ScrollHintContainer axis="vertical" viewportClassName="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-60">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleDecks.length === 0 ? (
            <EmptyState tab={tab} hasSearch={!!debouncedSearch} />
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6"
              >
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
              </motion.div>
            </AnimatePresence>
          )}
        </ScrollHintContainer>

        {/* ════════ FOOTER — fixed pagination (doesn't scroll) ════════ */}
        {!loading && totalPages > 1 && (
          <div className="shrink-0 border-t border-border bg-background px-6 py-2 flex justify-end">
            <PaginationBar
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={visibleDecks.length}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Mode filter pill (All / Quizlet / Anki)
───────────────────────────────────────── */
function ModePill({
  icon,
  label,
  active,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: "violet" | "sky";
}) {
  const activeCls =
    accent === "violet"
      ? "bg-violet-500 text-white border-violet-500"
      : accent === "sky"
        ? "bg-sky-500 text-white border-sky-500"
        : "bg-primary text-primary-foreground border-primary";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
        active
          ? `${activeCls} shadow-sm`
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────
   Sort dropdown
───────────────────────────────────────── */
function SortDropdown({
  value,
  open,
  onOpenChange,
  onChange,
}: {
  value: SortKey;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChange: (k: SortKey) => void;
}) {
  const active = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];
  const ActiveIcon = active.icon;
  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors min-w-44",
          open && "ring-1 ring-ring"
        )}
      >
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
        <span className="flex-1 text-left">{active.label}</span>
        <ActiveIcon className="size-3.5 text-muted-foreground" />
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
              className="absolute right-0 top-full mt-1 z-40 w-56 rounded-xl border border-border bg-popover shadow-lg py-1"
            >
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = opt.key === value;
                return (
                  <button
                    key={opt.key}
                    onClick={() => onChange(opt.key)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
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
   Tab pill button
───────────────────────────────────────── */
function TabButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent"
      )}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────
   Empty state
───────────────────────────────────────── */
function EmptyState({ tab, hasSearch }: { tab: Tab; hasSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-60 gap-3 text-center"
    >
      {tab === "favorites" ? (
        <>
          <Heart className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground max-w-sm">
            You haven't favorited any community decks yet. Browse{" "}
            <span className="font-medium text-foreground">Discover</span> and tap the heart
            on decks you want to come back to.
          </p>
        </>
      ) : (
        <>
          <Users className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground max-w-sm">
            {hasSearch
              ? "No public decks match your search."
              : "No public decks yet. Make a deck public from your library to share it with others."}
          </p>
        </>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Deck card — Mazii style with hover effects
───────────────────────────────────────── */
function CommunityDeckCard({
  deck,
  isOwn,
  favorited,
  cloning,
  togglingFav,
  onPreview,
  onClone,
  onToggleFavorite,
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
  const gradient = gradientFor(deck.id);
  const isAnki = deck.studyMode === "ANKI";

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.18, ease: "easeOut" } }}
      className="group relative rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-xl transition-shadow bg-card cursor-pointer flex flex-col"
      onClick={onPreview}
    >
      {/* Gradient header */}
      <div className={cn("relative h-28 bg-linear-to-br overflow-hidden", gradient)}>
        <div className="absolute -top-5 -right-5 size-20 rounded-full bg-white/10" />
        <div className="absolute top-6 -right-2 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />

        <div className="absolute bottom-3 left-4 size-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
          {isAnki ? (
            <Brain className="size-5 text-white" />
          ) : (
            <BookOpen className="size-5 text-white" />
          )}
        </div>

        <div className="absolute top-2.5 left-4">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
            {isAnki ? "ANKI" : "QUIZLET"}
          </span>
        </div>

        {/* Top-right: own decks get an ownership badge; others get a favorite heart */}
        {isOwn ? (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
            <Check className="size-3" />
            Của bạn
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            disabled={togglingFav}
            title={favorited ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "absolute top-2.5 right-2.5 size-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all",
              favorited
                ? "bg-rose-500 text-white shadow-md hover:bg-rose-600"
                : "bg-white/20 text-white hover:bg-white/30",
              togglingFav && "opacity-60 cursor-wait"
            )}
          >
            <Heart
              className={cn("size-4 transition-transform", favorited && "fill-current")}
            />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-10">
            {deck.title ?? "Untitled"}
          </p>
          {deck.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {deck.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{deck.totalCards ?? 0} cards</span>
          {deck.sourceLanguage && deck.targetLanguage && (
            <span className="font-mono uppercase text-[10px]">
              {deck.sourceLanguage} → {deck.targetLanguage}
            </span>
          )}
        </div>

        {/* CTA — own decks get a preview action; others can save to library */}
        {isOwn ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Eye className="size-3.5" />
            Xem deck của bạn
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClone();
            }}
            disabled={cloning}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            )}
          >
            {cloning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {cloning ? "Saving…" : "Save to my library"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
