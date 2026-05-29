import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import { usePermissions } from "@/hooks/usePermissions";
import { getHomePathByRole } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

/**
 * App logo + brand text — links to the role-aware home for authenticated
 * users, or to `/` for guests. Brand text hides on `< sm` to leave room
 * for the hamburger button + actions on phones.
 */
export function GuestLogo() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const homeTo = isAuthenticated ? getHomePathByRole(activeRole) : "/";

    return (
        <Link to={homeTo} className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                R
            </div>
            <span className="text-base font-semibold text-foreground hidden sm:inline-block">
                RBAC System
            </span>
        </Link>
    );
}
