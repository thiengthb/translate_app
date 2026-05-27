import { useEffect } from "react";

import { useLogout } from "@/hooks/useLogout";

/**
 * Route-level logout component (mounted on /logout). Triggers a logout on
 * mount and redirects to /login. Real logout work lives in {@link useLogout}.
 */
export const Logout = () => {
    const logout = useLogout();

    useEffect(() => {
        logout();
        // useLogout returns a stable closure tied to react-router + redux; we
        // only want this to fire once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
};
