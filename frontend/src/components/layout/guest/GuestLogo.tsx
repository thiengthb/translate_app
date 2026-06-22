import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import { HanabunMark } from "@/components/branding/HanabunLogo";
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
            {/* Candy sakura mark in a soft pink chip, matching the rest of
                the Hanabun shell. */}
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[12px] border border-[#FFC2D4] bg-[#FFF0F4] p-0.5 transition-colors group-hover/logo:bg-[#FFE5EC]">
                <HanabunMark />
            </div>
            <span className="font-display text-base font-bold text-[#FF6B9D] hidden sm:inline-block">
                Hanabun
            </span>
        </Link>
    );
}
