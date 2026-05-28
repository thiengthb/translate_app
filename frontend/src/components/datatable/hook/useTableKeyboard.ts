import { useEffect, useState } from "react";

interface Options {
    enabled?: boolean;
    rowCount: number;
    /** Called when user presses Enter on a focused row. */
    onActivate?: (rowIndex: number) => void;
    /** Called when user presses Delete on a focused row. */
    onDelete?: (rowIndex: number) => void;
    /** Container ref to limit Cmd+F focus to a child input. */
    onFocusSearch?: () => void;
    /** Cmd/Ctrl + A → select all on current page. */
    onSelectAll?: () => void;
    /** Esc → clear focus / cancel. */
    onEscape?: () => void;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingInField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return TYPING_TAGS.has(target.tagName);
}

/**
 * Lightweight keyboard navigation for ProTable.
 *
 *   ↑ / ↓        move focused row
 *   Enter        activate focused row (view / open)
 *   Delete       request delete
 *   ⌘/Ctrl + F   focus search
 *   ⌘/Ctrl + A   select all on this page
 *   Esc          blur / cancel
 *
 * Returns the index of the currently focused row, or `null`.
 */
export function useTableKeyboard({
    enabled = true,
    rowCount,
    onActivate,
    onDelete,
    onFocusSearch,
    onSelectAll,
    onEscape,
}: Options): number | null {
    const [focused, setFocused] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const handler = (e: KeyboardEvent) => {
            const typing = isTypingInField(e.target);

            // Cmd/Ctrl + F → focus search (works even when typing elsewhere)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
                if (onFocusSearch) {
                    e.preventDefault();
                    onFocusSearch();
                }
                return;
            }

            // Cmd/Ctrl + A → select all (only when not typing)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && !typing) {
                if (onSelectAll) {
                    e.preventDefault();
                    onSelectAll();
                }
                return;
            }

            if (typing) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocused((prev) => {
                        if (rowCount === 0) return null;
                        if (prev === null) return 0;
                        return Math.min(prev + 1, rowCount - 1);
                    });
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    setFocused((prev) => {
                        if (rowCount === 0) return null;
                        if (prev === null) return 0;
                        return Math.max(prev - 1, 0);
                    });
                    break;

                case "Enter":
                    if (focused !== null && onActivate) {
                        e.preventDefault();
                        onActivate(focused);
                    }
                    break;

                case "Delete":
                case "Backspace":
                    if (focused !== null && onDelete) {
                        e.preventDefault();
                        onDelete(focused);
                    }
                    break;

                case "Escape":
                    setFocused(null);
                    onEscape?.();
                    break;
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [enabled, rowCount, focused, onActivate, onDelete, onFocusSearch, onSelectAll, onEscape]);

    // Reset focus if row count shrinks below current focus
    useEffect(() => {
        if (focused !== null && focused >= rowCount) {
            setFocused(rowCount > 0 ? rowCount - 1 : null);
        }
    }, [rowCount, focused]);

    return focused;
}
