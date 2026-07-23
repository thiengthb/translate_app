import { useDispatch } from "react-redux";

import { authApi } from "@/api/features/auth.api";
import { setLogout } from "@/store/slices/auth/authSlice";
import { logger } from "@/lib/logger";

/**
 * Single source of truth for client-side logout.
 *
 * Always runs in this order — and crucially, always dispatches setLogout()
 * regardless of whether the server call succeeded — so the UI re-renders as
 * unauthenticated immediately, without waiting for a page reload to re-hydrate
 * Redux from (now-empty) localStorage.
 *
 *   1. POST /auth/logout  (revokes refresh token + clears cookie server-side)
 *   2. authStorage.clear() (done inside authApi.logout's finally)
 *   3. dispatch(setLogout())  → wipes Redux auth slice
 *
 * Mazii-style: logout does NOT navigate anywhere. The user stays on the current
 * URL and the app re-renders in guest mode in place — the shell flips to the
 * guest sidebar, public pages keep working, and personal routes fall back to
 * the in-shell login gate (see ProtectedRoute). No forced redirect to /login.
 */
export function useLogout() {
    const dispatch = useDispatch();

    return async () => {
        try {
            await authApi.logout();
        } catch (err) {
            logger.warn("Logout request failed; clearing local session anyway", err);
        } finally {
            dispatch(setLogout());
        }
    };
}
