import { useState } from "react";
import type { KvgNode } from "./kanjiVg";
import { KanjiComponentDialog } from "./KanjiComponentDialog";

/**
 * "Chiết tự" — the recursive component breakdown of a kanji, drawn as a
 * top-down tree (mirrors the Japanese Kanji Study app). Data comes from the
 * KanjiVG `tree` stored in `KanjiDetail.strokeData`.
 *
 * Connectors are pure CSS (org-chart style) so the tree stays responsive and
 * needs no measuring. The root character is highlighted in rose; leaf
 * components are muted circles. Clicking any node opens the component popup
 * (copy / search kanji containing it / its radical / its own kanji page).
 */

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

export function KanjiChietTu({ tree }: { tree: KvgNode | null }) {
  const [selected, setSelected] = useState<KvgNode | null>(null);

  if (!tree || !tree.children || tree.children.length === 0) return null;

  return (
    <>
    <div className="kvg-tree overflow-x-auto py-2">
      {/* Scoped org-chart connector styles (rendered once at the tree root). */}
      <style>{`
        .kvg-tree ul { display:flex; justify-content:center; position:relative; padding-top:22px; margin:0; }
        .kvg-tree li { list-style:none; position:relative; padding:22px 10px 0; text-align:center; }
        .kvg-tree li::before, .kvg-tree li::after {
          content:''; position:absolute; top:0; right:50%; width:50%; height:22px;
          border-top:2px solid var(--kvg-line);
        }
        .kvg-tree li::after { right:auto; left:50%; border-left:2px solid var(--kvg-line); }
        .kvg-tree > ul > li { padding-top:0; }
        .kvg-tree > ul > li::before, .kvg-tree > ul > li::after { display:none; }
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
      `}</style>
      <ul>
        <Node node={tree} depth={0} onSelect={setSelected} />
      </ul>
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
