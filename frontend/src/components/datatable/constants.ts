/**
 * Single source of truth for sticky utility-column widths. Imported by
 * ProTable (colgroup), header/body cells, and sticky-offset math so the
 * three never drift apart.
 */
export const EXPAND_COLUMN_WIDTH = 28;
export const SELECT_COLUMN_WIDTH = 20;
export const INDEX_COLUMN_WIDTH = 20;
export const ACTION_COLUMN_WIDTH = 54;

/** Default width for any data column without an explicit `width` in schema. */
export const DEFAULT_COLUMN_WIDTH = 150;

/** Minimum width when resizing a data column. */
export const DEFAULT_MIN_COLUMN_WIDTH = 60;

/**
 * Selector matching elements that should NOT trigger a row click when the
 * user interacts with them (form controls, menu items, custom interactive
 * elements marked with `data-no-row-click`). Used by ProTable's row click
 * handler to short-circuit when the target is interactive.
 */
export const ROW_CLICK_GUARD_SELECTOR = [
    "button",
    "a",
    "input",
    "label",
    "select",
    "textarea",
    "[role='button']",
    "[role='menuitem']",
    "[role='checkbox']",
    "[data-no-row-click]",
    "[data-state='open']",
].join(", ");

/**
 * Alternating row stripe — applied to sticky utility cells so their
 * background tracks the row stripe instead of going translucent during
 * horizontal scroll.
 */
export function rowStripeClass(index: number): string {
    return index % 2 === 0 ? "bg-muted/20" : "bg-card";
}
