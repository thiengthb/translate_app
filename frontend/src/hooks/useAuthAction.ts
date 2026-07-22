import { useCallback } from "react";
import { useSelector } from "react-redux";

import { useAuthModal } from "@/contexts/AuthModalContext";
import type { RootState } from "@/store/store";

/**
 * Guards a persistence action behind auth. Returns a wrapper: call it with the
 * real action and, when the viewer is a guest, it pops the auth modal instead
 * of running the action (and never navigates them away). When authenticated it
 * runs the action immediately.
 *
 *   const guard = useAuthAction();
 *   <button onClick={() => guard(() => saveToNotebook())}>Lưu</button>
 */
export function useAuthAction() {
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
    const { openLogin } = useAuthModal();

    return useCallback(
        (action: () => void) => {
            if (isAuthenticated) {
                action();
            } else {
                openLogin();
            }
        },
        [isAuthenticated, openLogin],
    );
}
