/**
 * Shared types + parser for the KanjiVG payload stored in
 * `KanjiDetail.strokeData` (a JSON string produced by
 * backend/scripts/gen-kanji-n5-seed.mjs).
 *
 *   { v: "0 0 109 109", strokes: ["M..","M.."], tree: { element, children } }
 *
 * `strokes` is ordered by KanjiVG stroke id; each tree node lists the stroke
 * indices in its subtree so a component can be highlighted in the animation.
 */
export interface KvgNode {
  element: string;
  original?: string;
  position?: string;
  radical?: string;
  phon?: string;
  strokes?: number[];
  children?: KvgNode[];
}

export interface KvgData {
  /** SVG viewBox, e.g. "0 0 109 109". */
  v: string;
  /** Ordered stroke path `d` attributes. */
  strokes: string[];
  /** Recursive component (chiết tự) tree; null when KanjiVG had no groups. */
  tree: KvgNode | null;
}

/** Safely parse the stored `strokeData` JSON; returns null on any problem. */
export function parseKvg(strokeData?: string | null): KvgData | null {
  if (!strokeData) return null;
  try {
    const o = JSON.parse(strokeData);
    if (!o || !Array.isArray(o.strokes) || o.strokes.length === 0) return null;
    return {
      v: typeof o.v === "string" ? o.v : "0 0 109 109",
      strokes: o.strokes as string[],
      tree: (o.tree ?? null) as KvgNode | null,
    };
  } catch {
    return null;
  }
}

/** True when the tree has at least one level of decomposition to show. */
export function hasDecomposition(tree: KvgNode | null): boolean {
  return !!tree && Array.isArray(tree.children) && tree.children.length > 0;
}
