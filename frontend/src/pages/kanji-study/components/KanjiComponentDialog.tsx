import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Copy, Grid, Languages, Search, X } from "lucide-react";
import { kanjiDetailApi, kanjiRadicalApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO, KanjiRadicalDTO } from "@/types";
import { KanjiByComponentList } from "./KanjiByComponentList";

/**
 * Popup shown when a node of the "chiết tự" tree is clicked (mirrors the
 * mobile Kanji Study app): copy the component, search kanji containing it,
 * jump to its bộ-thủ (radical) detail, or jump to its own kanji detail.
 *
 * Radical/kanji matches are resolved lazily by character — the KanjiVG
 * `element` first, then the `original` form a variant derives from
 * (e.g. 亻 falls back to 人).
 */

async function findRadicalByChar(chars: string[]): Promise<KanjiRadicalDTO | null> {
  for (const c of chars) {
    const res = await kanjiRadicalApi.getPage({ page: 0, size: 10 }, c).catch(() => null);
    const list = (res?.content ?? (res as any)?.items ?? []) as KanjiRadicalDTO[];
    const hit = list.find((r) => r.character === c);
    if (hit) return hit;
  }
  return null;
}

async function findKanjiByChar(char: string): Promise<KanjiDetailDTO | null> {
  const res = await kanjiDetailApi.getPage({ page: 0, size: 10 }, char).catch(() => null);
  const list = (res?.content ?? (res as any)?.items ?? []) as KanjiDetailDTO[];
  return list.find((k) => k.character === char) ?? null;
}

export function KanjiComponentDialog({
  element,
  original,
  currentCharacter,
  onClose,
}: {
  element: string;
  original?: string;
  /** Character of the kanji whose tree was clicked — hides the self "Chữ Hán" link on the root. */
  currentCharacter: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [view, setView] = useState<"menu" | "list">("menu");

  const lookupChars = original && original !== element ? [element, original] : [element];

  const { data: radical } = useQuery({
    queryKey: ["kanji-radical-by-char", ...lookupChars],
    staleTime: 30 * 60 * 1000,
    queryFn: () => findRadicalByChar(lookupChars),
  });

  const { data: kanji } = useQuery({
    queryKey: ["kanji-by-char", element],
    staleTime: 30 * 60 * 1000,
    queryFn: () => findKanjiByChar(element),
  });

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const MenuItem = ({
    icon,
    label,
    onClick,
  }: {
    icon: React.ReactNode;
    label: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-foreground hover:bg-muted/70 transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[15px]">{label}</span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${view === "list" ? "max-w-lg" : "max-w-md"} rounded-2xl border border-border bg-card shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {view === "menu" ? (
          <div className="py-1">
            <MenuItem
              icon={<Copy size={17} />}
              label="Sao chép vào khay nhớ tạm"
              onClick={() => {
                void navigator.clipboard?.writeText(element).catch(() => undefined);
                onClose();
              }}
            />
            <MenuItem
              icon={<Search size={17} />}
              label={<>Tìm Hán tự chứa 「{element}」</>}
              onClick={() => setView("list")}
            />
            {radical && (
              <MenuItem
                icon={<Grid size={17} />}
                label={<>Bộ thủ 「{radical.character}」</>}
                onClick={() => go(`/kanji-study/radical/${radical.id}`)}
              />
            )}
            {kanji && kanji.character !== currentCharacter && (
              <MenuItem
                icon={<Languages size={17} />}
                label={<>Chữ Hán 「{element}」</>}
                onClick={() => go(`/kanji-study/kanji/${kanji.id}`)}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col max-h-[80vh]">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-muted font-serif text-xl text-foreground shrink-0">
                {element}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">Hán tự chứa thành phần</span>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-2 py-2">
              <KanjiByComponentList
                component={element}
                onSelect={(k) => k.id != null && go(`/kanji-study/kanji/${k.id}`)}
              />
            </div>
            <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                ĐÓNG
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
