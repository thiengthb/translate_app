import { useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useLogout } from "@/hooks/useLogout";
import type { RootState } from "@/store/store";

/**
 * Global keyboard shortcut: `Ctrl+Shift+L` (Win/Linux) or `⌘+Shift+L`
 * (Mac) → log the current user out.
 *
 * Behaviour:
 *   - Only registers when an authenticated user is present (no-op for
 *     guests — there's nothing to log out from).
 *   - Skips when the user is typing in an input / textarea /
 *     contenteditable so the L key still works in form fields.
 *   - Three-key combo (Ctrl + Shift + L) makes accidental presses
 *     unlikely; we show a toast for feedback rather than a confirm
 *     dialog to keep the action fast.
 *
 * Wired into the app from `MainLayout` so it's available across both
 * the admin shell and the guest shell — wherever a logged-in user is.
 */
export function useLogoutShortcut() {
    const { isAuthenticated } = useSelector(
        (state: RootState) => state.auth,
    );
    const logout = useLogout();

    useEffect(() => {
        if (!isAuthenticated) return;

        const onKeyDown = (e: KeyboardEvent) => {
            const modifierHeld = (e.ctrlKey || e.metaKey) && e.shiftKey;
            if (!modifierHeld) return;
            if (e.key.toLowerCase() !== "l") return;

            const target = e.target as HTMLElement | null;
            if (
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable
            ) {
                return;
            }

            e.preventDefault();
            toast.info("Đang đăng xuất…");
            void logout();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isAuthenticated, logout]);
}
