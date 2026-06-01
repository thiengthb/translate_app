import { useCallback, useEffect, useState } from "react";

/**
 * Open-state + global `?` (Shift+/) trigger for the keyboard shortcuts
 * help dialog. Listener ignores keypresses while the user is typing
 * in an input / textarea / contenteditable so `?` can still be typed
 * normally.
 */
export function useKeyboardShortcutsDialog() {
    const [open, setOpen] = useState(false);

    const close = useCallback(() => setOpen(false), []);
    const toggle = useCallback(() => setOpen((v) => !v), []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "?") return;

            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (target?.isContentEditable) return;

            e.preventDefault();
            setOpen((v) => !v);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return { open, setOpen, close, toggle };
}
