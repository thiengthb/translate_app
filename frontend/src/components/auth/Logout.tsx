import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { useLogout } from "@/hooks/useLogout";

/**
 * Route-level logout component (mounted on /logout). Triggers a logout on
 * mount, then sends the user to the guest home (/dashboard). Unlike an
 * in-app logout (which stays on the current page — see {@link useLogout}), the
 * bare /logout URL has no "current page" to stay on, so we land on the guest
 * dashboard rather than the auth screen.
 */
export const Logout = () => {
    const logout = useLogout();

    useEffect(() => {
        logout();
        // useLogout returns a stable closure tied to redux; we only want this
        // to fire once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <Navigate to="/dashboard" replace />;
};
