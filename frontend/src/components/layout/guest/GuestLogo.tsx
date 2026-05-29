import { Box } from "lucide-react";
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
        <Link to={homeTo} className="flex items-center gap-2.5 shrink-0 group/logo">
            {/* Mirrors the admin "change role" pill style — soft primary
                tint + primary-tinted border, so the logo box reads as the
                same visual family as other rounded chips in the bar. */}
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary transition-colors group-hover/logo:bg-primary/15">
                <Box className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-semibold text-foreground hidden sm:inline-block">
                Gengo
            </span>
        </Link>
    );
}
