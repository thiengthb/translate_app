import { useSelector } from "react-redux";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge.tsx";

import { RoleSwitcher } from "@/components/layout/header/RoleSwitcher";

import { useRoleSwitch } from "@/contexts/RoleSwitchContext";
import type { RootState } from "@/store/store";

/**
 * Authenticated-user header actions, right-aligned in the top bar.
 *
 *   [Role ▾]  [Preview]
 *
 * Unauthenticated state falls through to minimal lang + theme toggles,
 * since the user has no avatar to hide them behind yet.
 */
export default function HeaderRight() {
    const { role, roles } = useSelector(
        (state: RootState) => state.auth,
    );
    const { isPreviewMode } = useRoleSwitch();

    // Unauthenticated → minimal chrome. Used by GuestLayout's auth pages.
    if (!role) {
        return (
            <div className="flex items-center gap-1">
                <LanguageSwitcher />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <RoleSwitcher primaryRole={role} roles={roles} />

            {isPreviewMode && (
                <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex text-[10px] uppercase tracking-wide"
                >
                    Preview
                </Badge>
            )}
        </div>
    );
}
