import { authApi } from "@/api/features/auth.api";
import { setLogout } from "@/store/slices/auth/authSlice";
import type { RootState } from "@/store/store";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";

export const Logout = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        const performLogout = async () => {
            try {
                if (isAuthenticated) {
                    await authApi.logout();
                }
            } catch (err) {
                logger.warn("Logout request failed; clearing local session anyway", err);
            } finally {
                dispatch(setLogout());
                navigate("/login", { replace: true });
            }
        };

        performLogout();
        // Intentionally omit isAuthenticated to prevent re-running on state update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, navigate]);

    return null;
};
