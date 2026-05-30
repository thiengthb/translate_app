import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, deckItemApi, favoriteDeckApi, flashcardApi } from "@/api";
import type {
  DeckDTO,
  FavoriteDeckDTO,
  FlashcardDTO,
} from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  ChevronLeft,
  Download,
  Heart,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { RevealMore } from "@/components/common/RevealMore";

const CARDS_INITIAL_VISIBLE = 30;

interface PreviewCard {
  orderIndex: number;
  flashcard: FlashcardDTO;
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function DeckPreviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [favorite, setFavorite] = useState<FavoriteDeckDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [visibleCards, setVisibleCards] = useState(CARDS_INITIAL_VISIBLE);

  /* ── Bump view count once when this preview opens ── */
  useEffect(() => {
    if (!deckId) return;
    deckApi.incrementView(Number(deckId));
  }, [deckId]);

  /* ── Load deck + cards + favorite state ── */
  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    setLoading(true);
    setVisibleCards(CARDS_INITIAL_VISIBLE);

    (async () => {
      try {
        const [deckData, itemsPage] = await Promise.all([
          deckApi.getById(deckId),
          deckItemApi.getPage(
            { page: 0, size: 500 },
            undefined,
            { deckId: Number(deckId) } as never
          ),
        ]);
        if (cancelled) return;
        setDeck(deckData);

        const items = itemsPage.content ?? [];
        if (items.length > 0) {
          const fcIds = items.map((it) => it.flashcardId).filter(Boolean);
          const fcPage = await flashcardApi.getPage(
            { page: 0, size: 500 },
            undefined,
            { ids: fcIds } as never
          );
          if (cancelled) return;
          const fcMap = new Map(
            (fcPage.content ?? []).map((fc) => [fc.id, fc])
          );
          const sorted: PreviewCard[] = items
            .map((it) => ({
              orderIndex: it.orderIndex ?? 0,
              flashcard: fcMap.get(it.flashcardId!) as FlashcardDTO | undefined,
            }))
            .filter((e): e is PreviewCard => e.flashcard != null)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          setCards(sorted);
        } else {
          setCards([]);
        }

        // Check if this deck is in the user's favorites
        if (currentUserId != null && deckData.id != null) {
          try {
            const favs = await favoriteDeckApi.listForUser(currentUserId);
            if (cancelled) return;
            setFavorite(favs.find((f) => f.deckId === deckData.id) ?? null);
          } catch {
            /* non-fatal */
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          const status = err?.response?.status ?? err?.status;
          if (status === 403 || status === 401) setAccessDenied(true);
          else toast.error("Không thể tải xem trước deck.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deckId, currentUserId]);

  /* ── Derived ── */
  const isOwnDeck = useMemo(
    () => deck != null && deck.userId != null && deck.userId === currentUserId,
    [deck, currentUserId]
  );
  const isAnki = deck?.studyMode === "ANKI";

  /* ── Actions ── */
  const handleClone = async () => {
    if (!deck?.id) return;
    setCloning(true);
    try {
      const cloned = await deckApi.clone(deck.id);
      toast.success(`Saved "${cloned.title}" to your library.`);
      // Navigate into the cloned deck — user can study it right away
      if (cloned.id) {
        navigate(
          cloned.studyMode === "ANKI"
            ? `/deck/${cloned.id}/anki`
            : `/deck/${cloned.id}`
        );
      } else {
        navigate("/library");
      }
    } catch {
      toast.error("Failed to save deck. Please try again.");
      setCloning(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!deck?.id || currentUserId == null) return;
    setTogglingFav(true);
    try {
      if (favorite?.id != null) {
        await favoriteDeckApi.unfavorite(favorite.id);
        setFavorite(null);
      } else {
        const created = await favoriteDeckApi.favorite(currentUserId, deck.id);
        setFavorite(created);
      }
    } catch {
      toast.error("Failed to update favorite.");
    } finally {
      setTogglingFav(false);
    }
  };

  /* ── Render ── */
  return (
    <MainLayout
      parentCrumb={{ href: "/community", title: "Shared" }}
      ignorePaths={["deck", String(deckId)]}
      pathName={{ [`/deck/${deckId}/preview`]: deck?.title ?? "Preview" }}
    >
      <div className="w-full pb-16 space-y-6 pt-2">

        {/* Back link */}
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back to community
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : accessDenied ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
            <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Users className="size-7 text-muted-foreground/40" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-medium text-foreground">Bộ thẻ này là riêng tư</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chủ sở hữu đã đặt bộ thẻ này ở chế độ riêng tư và không thể xem được.
              </p>
            </div>
          </div>
        ) : !deck ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
            Deck not found.
          </div>
        ) : (
          <>
            {/* ── Deck header ── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div
                className={cn(
                  "h-28 bg-linear-to-br relative",
                  isAnki
                    ? "from-indigo-500 to-blue-600"
                    : "from-violet-500 to-purple-600"
                )}
              >
                <div className="absolute -top-5 -right-5 size-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-3 left-8 size-14 rounded-full bg-black/10" />
                <span className="absolute top-3 left-5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
                  {isAnki ? "ANKI" : "QUIZLET"}
                </span>
                <div className="absolute bottom-3 left-5 size-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  {isAnki ? (
                    <Brain className="size-6 text-white" />
                  ) : (
                    <BookOpen className="size-6 text-white" />
                  )}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    {deck.title ?? "Untitled"}
                  </h1>
                  {deck.description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {deck.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    Shared by community
                  </span>
                  <span>·</span>
                  <span className="font-medium">
                    {cards.length} {cards.length === 1 ? "card" : "cards"}
                  </span>
                  {deck.sourceLanguage && deck.targetLanguage && (
                    <>
                      <span>·</span>
                      <span className="font-mono uppercase text-[10px]">
                        {deck.sourceLanguage} → {deck.targetLanguage}
                      </span>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {isOwnDeck ? (
                    <button
                      onClick={() =>
                        navigate(
                          isAnki ? `/deck/${deck.id}/anki` : `/deck/${deck.id}`
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <BookOpen className="size-4" />
                      Start studying
                    </button>
                  ) : (
                    <button
                      onClick={handleClone}
                      disabled={cloning}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {cloning ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {cloning ? "Saving…" : "Save to my library"}
                    </button>
                  )}

                  {!isOwnDeck && (
                    <button
                      onClick={handleToggleFavorite}
                      disabled={togglingFav}
                      title={
                        favorite ? "Remove from favorites" : "Add to favorites"
                      }
                      className={cn(
                        "px-3 py-2.5 rounded-lg border-2 transition-colors flex items-center gap-1.5 text-sm font-semibold",
                        favorite
                          ? "border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                        togglingFav && "opacity-60"
                      )}
                    >
                      <Heart
                        className={cn(
                          "size-4 transition-transform",
                          favorite && "fill-current"
                        )}
                      />
                      {favorite ? "Favorited" : "Favorite"}
                    </button>
                  )}
                </div>

                {!isOwnDeck && (
                  <p className="text-[11px] text-muted-foreground/80 pt-1">
                    Save this deck to your library to start studying with it.
                  </p>
                )}
              </div>
            </div>

            {/* ── Card list ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {cards.length} {cards.length === 1 ? "Card" : "Cards"} in this deck
                </h2>
              </div>

              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  This deck has no cards yet.
                </div>
              ) : (
                <>
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {cards.slice(0, visibleCards).map((entry, i) => (
                        <motion.li
                          key={entry.flashcard.id ?? i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.15,
                            delay: Math.min((i % 30) * 0.02, 0.2),
                          }}
                        >
                          <PreviewCardRow index={i + 1} card={entry.flashcard} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>

                  <RevealMore
                    total={cards.length}
                    visibleCount={visibleCards}
                    onChange={setVisibleCards}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   One preview row (front / back side-by-side)
───────────────────────────────────────── */
function PreviewCardRow({
  index,
  card,
}: {
  index: number;
  card: FlashcardDTO;
}) {
  const frontText = useMemo(() => sideText(card, "FRONT"), [card]);
  const backText = useMemo(() => sideText(card, "BACK"), [card]);
  const frontImages = useMemo(() => sideMedia(card, "FRONT", "IMAGE"), [card]);
  const backImages = useMemo(() => sideMedia(card, "BACK", "IMAGE"), [card]);

  return (
    <div className="rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-sm transition-all overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {/* Front */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Front
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              #{index}
            </span>
          </div>
          <div className="space-y-1.5">
            {frontText.length > 0 ? (
              frontText.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "leading-snug text-foreground",
                    i === 0
                      ? "text-base font-semibold"
                      : "text-sm text-foreground/80"
                  )}
                >
                  {line}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">(empty)</p>
            )}
            {frontImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {frontImages.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="max-h-20 rounded-md border border-border object-contain"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Back */}
        <div className="p-4 space-y-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Back
            </span>
          </div>
          <div className="space-y-1.5">
            {backText.length > 0 ? (
              backText.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "leading-snug text-foreground",
                    i === 0
                      ? "text-base font-semibold"
                      : "text-sm text-foreground/80"
                  )}
                >
                  {line}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">(empty)</p>
            )}
            {backImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {backImages.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="max-h-20 rounded-md border border-border object-contain"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Helpers — extract content from sides/contents
───────────────────────────────────────── */
function sideText(card: FlashcardDTO, side: "FRONT" | "BACK"): string[] {
  const found = card.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const lines = found.contents
      .filter((c) => c.contentType === "TEXT" || c.contentType === "CLOZE")
      .map((c) => c.contentValue)
      .filter(Boolean) as string[];
    if (lines.length > 0) return lines;
  }
  const legacy = side === "FRONT" ? card.front : card.back;
  return legacy ? legacy.split("\n").filter(Boolean) : [];
}

function sideMedia(
  card: FlashcardDTO,
  side: "FRONT" | "BACK",
  type: "IMAGE" | "AUDIO" | "VIDEO"
): string[] {
  const found = card.sides?.find((s) => s.side === side);
  if (!found?.contents) return [];
  return found.contents
    .filter((c) => c.contentType === type)
    .map((c) => c.contentValue)
    .filter(Boolean) as string[];
}
