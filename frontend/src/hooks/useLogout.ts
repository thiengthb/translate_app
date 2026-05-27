import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

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
 *   4. navigate("/login", replace)
 */
export function useLogout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    return async () => {
        try {
            await authApi.logout();
        } catch (err) {
            logger.warn("Logout request failed; clearing local session anyway", err);
        } finally {
            dispatch(setLogout());
            navigate("/login", { replace: true });
        }
    };
}
