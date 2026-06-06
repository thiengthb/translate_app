import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { kanjiDetailApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO } from "@/types";

/**
 * Renders the "Cách viết khác" (alternate writing forms) of a kanji as
 * clickable glyphs. Each resolves its own kanji_details id (cached by
 * character) and navigates to that kanji's detail page — which, having no
 * ?deck context, lets the page's back button return to the previous kanji.
 *
 * The alternate forms live in the hidden "Khác" pool (no deck, not counted in
 * progress); their only entry point is a link like this.
 */

function VariantLink({ char }: { char: string }) {
  const navigate = useNavigate();
  const { data: id, isLoading } = useQuery<number | null>({
    queryKey: ["kanji-id-by-char", char],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      // `character` isn't a server-side filter field, so use full-text search
      // (which covers the character) and pick the exact match.
      const res = await kanjiDetailApi.getPage({ page: 0, size: 10 }, char);
      const list = (res.content ?? (res as any).items ?? []) as KanjiDetailDTO[];
      const hit = list.find((k) => k.character === char) ?? list[0];
      return hit?.id ?? null;
    },
  });

  return (
    <button
      type="button"
      onClick={() => id != null && navigate(`/kanji-study/kanji/${id}`)}
      disabled={isLoading || id == null}
      title={id == null ? char : `Xem ${char}`}
      className="inline-grid place-items-center h-9 min-w-9 px-1.5 rounded-lg font-serif text-xl border border-border bg-card text-foreground hover:border-rose-400 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {char}
    </button>
  );
}

export function KanjiVariantLinks({ variants }: { variants: string[] }) {
  if (variants.length === 0) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-border/60 items-center">
      <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">Cách viết khác</span>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <VariantLink key={v} char={v} />
        ))}
      </div>
    </div>
  );
}
