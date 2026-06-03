import { useLayoutEffect, useState } from "react";
import type { DependencyList, RefObject } from "react";

/**
 * Compute how many items fill one page so a grid/list fits the viewport without
 * vertical scrolling. Measures the live container: real column count
 * (`grid-template-columns`; a non-grid list resolves to 1), a real item's
 * height, and the row gap — against the height available below the container's
 * top edge. `floor` keeps a page from overflowing (full page, no scroll).
 *
 * `deps` should change when the layout might change (view mode, active tab,
 * data-ready) so the size is re-measured. Falls back to `fallback` until it can
 * measure (e.g. before any item is rendered).
 */
export function useFillPageSize<T extends HTMLElement>(
  gridRef: RefObject<T | null>,
  deps: DependencyList = [],
  fallback = 12,
): number {
  const [size, setSize] = useState(fallback);
  useLayoutEffect(() => {
    const measure = () => {
      const grid = gridRef.current;
      const first = grid?.firstElementChild as HTMLElement | null;
      if (!grid || !first) return;
      const cs = getComputedStyle(grid);
      const cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const rowGap = parseFloat(cs.rowGap) || 0;
      const itemH = first.offsetHeight;
      if (itemH <= 0) return;
      const RESERVE = 80; // footer + bottom padding below the grid
      const avail = window.innerHeight - grid.getBoundingClientRect().top - RESERVE;
      const rows = Math.max(1, Math.floor((avail + rowGap) / (itemH + rowGap)));
      const next = cols * rows;
      setSize((prev) => (next > 0 && next !== prev ? next : prev));
    };
    measure();
    const node = gridRef.current;
    const ro = new ResizeObserver(measure);
    if (node) ro.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, ...deps]);
  return size;
}
