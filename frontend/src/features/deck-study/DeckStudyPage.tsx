import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Pencil, X } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DeckAccessControl } from "@/components/common/DeckAccessControl";
import { deckBgStyle, deckIconComponent } from "@/lib/deckVisual";
import { getCurrentUserId } from "@/utils/auth.utils";
import { cn } from "@/lib/utils";
import { ModeBar } from "./ModeBar";
import { FlashcardMode } from "./modes/FlashcardMode";
import { LearnMode } from "./modes/LearnMode";
import { MatchMode } from "./modes/MatchMode";
import { SrsMode } from "./modes/SrsMode";
import { useDeckStudyData } from "./useDeckStudyData";
import type { StudyMode } from "./types";

const VALID_MODES: StudyMode[] = ["FLASHCARD", "LEARN", "MATCH", "SRS"];

function parseMode(value: string | null): StudyMode | null {
  return value && (VALID_MODES as string[]).includes(value) ? (value as StudyMode) : null;
}

/**
 * Unified deck study screen. One screen, many modes: Flashcard / Learn / Match
 * / Write / Quiz all run off the same loaded cards and persist into the Quizlet
 * tables; SRS Review is the only mode that touches spaced-repetition
 * scheduling. The active mode is reflected in the `?mode=` query param so it is
 * shareable and back-button friendly.
 *
 * Mounted at both `/deck/:deckId` and `/deck/:deckId/anki` (the latter defaults
 * to SRS, keeping old links and the Anki card/template editors working).
 */
export default function DeckStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAnkiPath = location.pathname.endsWith("/anki");
  const { loading, accessDenied, deck, setDeck, cards } = useDeckStudyData(deckId);

  // Default to SRS Review: opening a deck lands on spaced-repetition first.
  // An explicit `?mode=` (or the legacy `/anki` path) still wins.
  const [mode, setMode] = useState<StudyMode>(
    () => (isAnkiPath ? "SRS" : parseMode(searchParams.get("mode")) ?? "SRS")
  );
  const [fullView, setFullView] = useState(false);
  const [srsDue, setSrsDue] = useState<number | undefined>(undefined);
  const toggleFullView = () => setFullView((v) => !v);

  const changeMode = (next: StudyMode) => {
    setMode(next);
    setFullView(false);
    const params = new URLSearchParams(searchParams);
    params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

  /* Lock body scroll while in full view */
  useEffect(() => {
    if (!fullView) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullView]);

  /* Esc exits full view */
  useEffect(() => {
    if (!fullView) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullView(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullView]);

  const resolvedMode = mode;
  // SRS fills the available height (card grows, controls pinned below) for an
  // immersive review surface; the other modes keep their natural, scrollable flow.
  const srsFill = resolvedMode === "SRS";
  const currentUserId = getCurrentUserId();
  const isOwner = !!deck && deck.userId === currentUserId;

  // Deck icon rendered at the breadcrumb endpoint, left of the deck title.
  const breadcrumbIcon = deck
    ? (() => {
        const DeckIcon = deckIconComponent(deck);
        return (
          <span
            className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] shadow-sm"
            style={deckBgStyle(deck)}
          >
            <DeckIcon className="size-3 text-white" />
          </span>
        );
      })()
    : undefined;

  const activeMode = (() => {
    if (resolvedMode === "SRS") {
      return (
        <SrsMode
          deckId={Number(deckId)}
          fullView={fullView}
          onToggleFullView={toggleFullView}
          onDueCount={setSrsDue}
        />
      );
    }
    if (cards.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <BookOpen className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">This deck has no cards yet.</p>
        </div>
      );
    }
    const props = { deckId: Number(deckId), cards, fullView, onToggleFullView: toggleFullView };
    switch (resolvedMode) {
      case "LEARN":
        return <LearnMode {...props} />;
      case "MATCH":
        return <MatchMode {...props} />;
      case "FLASHCARD":
      default:
        return <FlashcardMode {...props} />;
    }
  })();

  return (
    <MainLayout
      parentCrumb={{ href: "/library", title: "My Library" }}
      ignorePaths={isAnkiPath ? ["deck", String(deckId)] : ["deck"]}
      pathName={{ [location.pathname]: deck?.title ?? "Study" }}
      breadcrumbIcon={breadcrumbIcon}
    >
      {/* Full view is a CSS overlay on the SAME subtree (not a separate tree)
          so toggling it never remounts the active mode / loses its session.
          The zoom toggle + Esc handle exiting (no separate overlay button). */}
      <div
        className={cn(
          "w-full",
          fullView
            ? srsFill
              ? "fixed inset-0 z-50 flex flex-col bg-background p-3 sm:p-4"
              : "fixed inset-0 z-50 overflow-y-auto bg-background"
            : srsFill
              ? "flex min-h-0 flex-1 flex-col gap-5 py-2"
              : "space-y-5 pb-16 pt-2"
        )}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        ) : accessDenied ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
              <X className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Bộ thẻ này là riêng tư</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Bạn không có quyền truy cập bộ thẻ này. Chỉ chủ sở hữu mới có thể xem.
            </p>
            <button
              onClick={() => navigate("/library")}
              className="mt-2 h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Về thư viện
            </button>
          </div>
        ) : (
          <>
            {/* Header row — hidden in full view. The mode tabs sit on the left,
                on the same line as the deck-level actions (access / edit) on the
                right. The deck title + icon live in the breadcrumb; shuffle /
                reset / zoom live on the card itself. */}
            {!fullView && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <ModeBar mode={resolvedMode} onChange={changeMode} srsDue={srsDue} />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isOwner && deck && (
                    <DeckAccessControl
                      deckId={deck.id!}
                      visibility={(deck.visibility as "PUBLIC" | "PRIVATE") ?? "PRIVATE"}
                      onChanged={(next) => setDeck((d) => (d ? { ...d, visibility: next } : d))}
                    />
                  )}
                  {isOwner && (
                    <button
                      onClick={() => navigate(`/deck/${deckId}/edit`)}
                      title="Chỉnh sửa deck"
                      aria-label="Chỉnh sửa deck"
                      className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active mode — same element whether or not full view */}
            <div
              className={cn(
                srsFill
                  ? "flex min-h-0 flex-1 flex-col"
                  : fullView
                    ? "mx-auto w-full max-w-4xl px-4 py-8 sm:px-16 sm:py-12"
                    : "min-h-0"
              )}
            >
              {activeMode}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
