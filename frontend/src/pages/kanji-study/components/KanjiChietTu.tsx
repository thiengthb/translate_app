import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GitFork, X } from "lucide-react";
import type { KvgNode } from "./kanjiVg";
import { KanjiComponentDialog } from "./KanjiComponentDialog";

/**
 * "Chiết tự" — the recursive component breakdown of a kanji, drawn as a
 * top-down tree (mirrors the Japanese Kanji Study app). Data comes from the
 * KanjiVG `tree` stored in `KanjiDetail.strokeData`.
 *
 * Connectors are pure CSS (org-chart style). The root character is highlighted
 * in rose; leaf components are muted circles. Clicking any node opens the
 * component popup (copy / search kanji containing it / its radical / its kanji).
 *
 * Two modes:
 * - `fit` (default, inline card): the whole tree is uniformly scaled DOWN to fit
 *   BOTH the card width and {@link maxHeight} so nothing is clipped or scrolls —
 *   an at-a-glance overview. Click the card title to open the big version.
 * - non-fit (the {@link KanjiChietTuModal}): natural size, scroll to pan around.
 */

/** Smallest the inline overview shrinks to; the modal shows full size. */
const MIN_SCALE = 0.4;

const KVG_CSS = `
  .kvg-tree ul { display:flex; justify-content:center; position:relative; padding-top:22px; margin:0; }
  .kvg-tree li { list-style:none; position:relative; padding:22px 10px 0; text-align:center; }
  .kvg-tree li::before, .kvg-tree li::after {
    content:''; position:absolute; top:0; right:50%; width:50%; height:22px;
    border-top:2px solid var(--kvg-line);
  }
  .kvg-tree li::after { right:auto; left:50%; border-left:2px solid var(--kvg-line); }
  .kvg-scale > ul > li { padding-top:0; }
  .kvg-scale > ul > li::before, .kvg-scale > ul > li::after { display:none; }
  .kvg-tree li:only-child { padding-top:22px; }
  .kvg-tree li:first-child::before, .kvg-tree li:last-child::after { border:0 none; }
  .kvg-tree li:last-child::before { border-right:2px solid var(--kvg-line); border-radius:0 6px 0 0; }
  .kvg-tree li:first-child::after { border-radius:6px 0 0 0; }
  .kvg-tree ul ul::before {
    content:''; position:absolute; top:0; left:50%; width:0; height:22px;
    border-left:2px solid var(--kvg-line);
  }
  .kvg-tree { --kvg-line: rgb(148 163 184 / 0.45); }
  .kvg-node-wrap { display:flex; justify-content:center; }
`;

const POSITION_VI: Record<string, string> = {
  left: "trái",
  right: "phải",
  top: "trên",
  bottom: "dưới",
  "tare": "bao trên",
  "nyo": "bao dưới",
  "kamae": "bao ngoài",
};

function Node({
  node,
  depth,
  onSelect,
}: {
  node: KvgNode;
  depth: number;
  onSelect: (node: KvgNode) => void;
}) {
  const kids = node.children ?? [];
  const isRoot = depth === 0;
  const size = isRoot ? "h-16 w-16 text-3xl" : "h-12 w-12 text-2xl";

  const titleParts = [
    node.position ? `vị trí: ${POSITION_VI[node.position] ?? node.position}` : null,
    node.radical ? "bộ thủ" : null,
    node.original && node.original !== node.element ? `gốc: ${node.original}` : null,
    node.phon ? `âm: ${node.phon}` : null,
  ].filter(Boolean);

  return (
    <li>
      <div className="kvg-node-wrap">
        <button
          type="button"
          onClick={() => onSelect(node)}
          title={titleParts.join(" · ") || undefined}
          className={[
            "grid place-items-center rounded-full font-serif shrink-0 select-none border transition-colors cursor-pointer",
            "hover:ring-2 hover:ring-rose-400/60",
            size,
            isRoot
              ? "bg-rose-500 text-white border-rose-500 shadow-sm"
              : node.radical
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : "bg-muted text-foreground border-border",
          ].join(" ")}
        >
          {node.element}
        </button>
      </div>
      {kids.length > 0 && (
        <ul>
          {kids.map((k, i) => (
            <Node key={i} node={k} depth={depth + 1} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function KanjiChietTu({
  tree,
  fit = true,
  maxHeight = 360,
}: {
  tree: KvgNode | null;
  /** Inline overview scales to fit; the modal passes `false` for full size. */
  fit?: boolean;
  /** Height budget the inline overview is scaled to fit within. */
  maxHeight?: number;
}) {
  const [selected, setSelected] = useState<KvgNode | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Scaled box of the tree; the card is sized to it and it's centered as a unit.
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Fit the tree to BOTH the card width and the height budget (uniform scale).
  useLayoutEffect(() => {
    if (!fit) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const naturalW = content.scrollWidth;
      const naturalH = content.scrollHeight;
      const avail = container.clientWidth;
      if (!naturalW || !naturalH || !avail) return;
      // Scale to fit the card width and aim for the height budget — but a very
      // deep tree that bottoms out at MIN_SCALE must NOT be capped at maxHeight,
      // or its lower branches get clipped. Size the card to the scaled tree so
      // the whole thing always shows (it just grows a little past maxHeight).
      const s = Math.max(MIN_SCALE, Math.min(1, avail / naturalW, maxHeight / naturalH));
      setScale(s);
      setBox({ w: Math.ceil(naturalW * s), h: Math.ceil(naturalH * s) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [tree, fit, maxHeight]);

  if (!tree || !tree.children || tree.children.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        className={`kvg-tree ${fit ? "overflow-hidden" : ""} py-2`}
        style={fit ? { height: box.h || undefined } : undefined}
      >
        <style>{KVG_CSS}</style>
        {fit ? (
          /* A centered wrapper reserving the SCALED size, with the tree scaled
             from its top-left to fill it — so the whole tree is centered as one
             block instead of margin:auto collapsing on an overflowing width. */
          <div style={{ width: box.w || undefined, height: box.h || undefined, margin: "0 auto", position: "relative" }}>
            <div
              ref={contentRef}
              className="kvg-scale"
              style={{
                width: "max-content",
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <ul>
                <Node node={tree} depth={0} onSelect={setSelected} />
              </ul>
            </div>
          </div>
        ) : (
          <div ref={contentRef} className="kvg-scale" style={{ width: "max-content" }}>
            <ul>
              <Node node={tree} depth={0} onSelect={setSelected} />
            </ul>
          </div>
        )}
      </div>

      {/* Rendered OUTSIDE .kvg-tree — its scoped ul/li styles would otherwise
          leak into the dialog's list and force rows into a horizontal flex. */}
      {selected && (
        <KanjiComponentDialog
          element={selected.element}
          original={selected.original}
          currentCharacter={tree.element}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

/** Full-size, scrollable chiết tự — opened by clicking the card title. */
export function KanjiChietTuModal({
  tree,
  onClose,
}: {
  tree: KvgNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col rounded-2xl border border-border bg-card shadow-xl overflow-hidden w-[88vmin] h-[88vmin] max-w-[94vw] max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
          <GitFork size={16} className="text-rose-500" />
          <span className="flex-1 text-sm font-semibold text-foreground">
            Chiết tự 「{tree.element}」
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        {/* flex + m-auto centers the tree both ways; auto margins collapse to 0
            when the tree is larger than the box, so wide trees scroll from the
            start instead of being clipped on the left. */}
        <div className="flex-1 overflow-auto p-4 flex">
          <div className="m-auto">
            <KanjiChietTu tree={tree} fit={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
