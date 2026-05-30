/**
 * Briefly enables a smooth color/theme cross-fade.
 *
 * Adds the `theme-transition` class to `<html>` (CSS in `index.css` makes
 * color-ish properties ease over ~250ms while it's present) and removes it
 * once the fade is done. Used by every entry point that re-tints the UI —
 * theme toggle, theme radio in Settings/avatar, and color-preset switch — so
 * the palette eases in instead of snapping (which is harsh on the eyes).
 *
 * The timer is module-level + reset on each call, so rapid successive
 * switches keep the transition active for the full window rather than each
 * call cutting the previous one short.
 */
const TRANSITION_MS = 250;

let removeTimer: ReturnType<typeof setTimeout> | undefined;

export function playThemeTransition(): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.add("theme-transition");

    // Force a synchronous style/layout flush so the browser commits the
    // "transition enabled + OLD colors" baseline NOW. The caller changes the
    // CSS vars / `.dark` class in the same JS tick (React effect); without
    // this flush the transition would be added in the SAME recalc as the
    // value change, so the browser has no before-state to animate from and
    // the palette snaps. Reading `offsetWidth` triggers the recalc.
    void root.offsetWidth;

    if (removeTimer) clearTimeout(removeTimer);
    // Hold the class a touch past the transition so the fade finishes before
    // we strip the rule (otherwise the last frame snaps).
    removeTimer = setTimeout(() => {
        root.classList.remove("theme-transition");
        removeTimer = undefined;
    }, TRANSITION_MS + 40);
}
