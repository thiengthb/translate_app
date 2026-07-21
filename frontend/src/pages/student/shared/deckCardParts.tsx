import { useEffect, useRef, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { ankiStudyApi } from "@/api";
import type { AnkiStatsDTO } from "@/api";
import type { DeckDTO } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";

/**
 * Shared deck-card building blocks so the My Library and the Shared (community)
 * pages render decks identically: title + public/private, the New/Learning/
 * Review breakdown, etc.
 */

/* ── Public/private icon + tooltip (reused inline and as a corner badge) ── */
export function VisibilityBadge({ deck, className }: { deck: DeckDTO; className?: string }) {
  const isPublic = deck.visibility === "PUBLIC";
  return (
    <TooltipWrapper content={isPublic ? "Công khai" : "Riêng tư"}>
      <span className={cn("shrink-0 cursor-default text-muted-foreground", className)}>
        {isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
      </span>
    </TooltipWrapper>
  );
}

/* ── Title (1 line, truncates up to the icon) + public/private, with tooltip ── */
export function DeckTitleRow({ deck, showVisibility = true }: { deck: DeckDTO; showVisibility?: boolean }) {
  const description = deck.description?.trim();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [deck.title]);

  const titleEl = (
    <h3 ref={titleRef} className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-foreground">
      {deck.title ?? "Chưa có tiêu đề"}
    </h3>
  );
  const showTip = truncated || !!description;

  return (
    <div className="flex items-center gap-2">
      {showTip ? (
        <Tooltip>
          <TooltipTrigger asChild>{titleEl}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] break-words">
            {truncated && <p className="font-semibold">{deck.title}</p>}
            {description && <p className={cn("text-xs", truncated && "mt-1 text-muted-foreground")}>{description}</p>}
          </TooltipContent>
        </Tooltip>
      ) : (
        titleEl
      )}
      {showVisibility && <VisibilityBadge deck={deck} />}
    </div>
  );
}

/* ── New / Learning / Review (fetched per deck) + hover legend ── */
export function DeckStatsInline({ deck }: { deck: DeckDTO }) {
  const [stats, setStats] = useState<AnkiStatsDTO | null>(null);
  useEffect(() => {
    if (deck.id == null) return;
    let cancelled = false;
    ankiStudyApi.getStats(deck.id).then((s) => !cancelled && setStats(s)).catch(() => {});
    return () => { cancelled = true; };
  }, [deck.id]);
  if (!stats) return null;
  const learning = stats.learningCards + stats.relearningCards;
  const dueToday = stats.dueReviewCards ?? stats.dueToday ?? 0;
  // Pills shaped exactly like a TagChip (px-1.5 py-0.5 text-[10px] rounded-full),
  // neutral text, a coloured dot to tell them apart, full label on hover.
  const pills = [
    { dot: "bg-blue-500", value: stats.newCards, label: `Mới hôm nay: ${stats.newCards}` },
    { dot: "bg-orange-500", value: learning, label: `Đang học: ${learning}` },
    { dot: "bg-emerald-600", value: dueToday, label: `Đến hạn hôm nay: ${dueToday}` },
  ];
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {pills.map((p) => (
        <TooltipWrapper key={p.label} content={p.label}>
          <span className="inline-flex shrink-0 cursor-default items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
            <span className={cn("size-1.5 rounded-full", p.dot)} />
            {p.value}
          </span>
        </TooltipWrapper>
      ))}
    </div>
  );
}
