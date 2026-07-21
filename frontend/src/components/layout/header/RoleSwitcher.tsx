import { ChevronDown, GraduationCap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRoleSwitch } from "@/contexts/RoleSwitchContext";
import {
    formatRoleLabel,
    getHomePathByRole,
    normalizeRole,
    uniqueRoles,
} from "@/utils/rbac.utils";

interface RoleSwitcherProps {
    /** Primary role from auth state — drives "Assigned" vs "Preview" tag. */
    primaryRole: string | null | undefined;
    /** All roles assigned to the user (deduped by formatRoleLabel). */
    roles: string[] | null | undefined;
}

/**
 * Pill button + dropdown that lets a multi-role user switch the view's
 * effective role. Roles outside the user's assigned list show a "Preview"
 * tag — the context still grants real permissions, but the chrome (sidebar
 * shell, primary role badge) follows the auth role, not the active one.
 *
 * Previously built with a custom popover + manual click-outside; rewritten
 * on Radix `DropdownMenu` for consistency with the rest of the app
 * (a11y, keyboard nav, portal positioning).
 */
export function RoleSwitcher({ primaryRole, roles }: RoleSwitcherProps) {
    const navigate = useNavigate();
    const { activeRole, availableRoles, setViewRole } = useRoleSwitch();

    const normalisedPrimary = normalizeRole(primaryRole);
    const assignedRoles = uniqueRoles(roles, normalisedPrimary);
    const currentRole = activeRole ?? normalisedPrimary;
    const isStudentRole = currentRole === "STUDENT";

    if (availableRoles.length <= 1) return null;

    const switchTo = (nextRole: string) => {
        const normalized = normalizeRole(nextRole);
        setViewRole(normalized === normalisedPrimary ? null : normalized);
        navigate(getHomePathByRole(normalized));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    title={`Đang xem với vai trò ${formatRoleLabel(currentRole)} — bấm để đổi`}
                    className={cn(
                        "flex items-center gap-1 h-7 px-2 rounded-full text-xs font-medium border transition-colors cursor-pointer max-w-[120px]",
                        isStudentRole
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30"
                            : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15",
                    )}
                >
                    {isStudentRole ? (
                        <GraduationCap size={12} className="shrink-0" />
                    ) : (
                        <ShieldCheck size={12} className="shrink-0" />
                    )}
                    <span className="truncate">
                        {formatRoleLabel(currentRole)}
                    </span>
                    <ChevronDown
                        size={11}
                        className="shrink-0 opacity-60 data-[state=open]:rotate-180 transition-transform"
                    />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Đổi chế độ xem
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableRoles.map((availableRole) => {
                    const normalized = normalizeRole(availableRole);
                    const selected = normalized === currentRole;
                    const isAssigned = assignedRoles.includes(normalized);
                    const studentRow = normalized === "STUDENT";
                    const Icon = studentRow ? GraduationCap : ShieldCheck;

                    return (
                        <DropdownMenuItem
                            key={availableRole}
                            onSelect={() => switchTo(availableRole)}
                            className={cn(
                                "gap-2 text-sm cursor-pointer",
                                selected &&
                                    (studentRow
                                        ? "text-green-700 font-medium bg-green-50/60 dark:text-green-400 dark:bg-green-500/10"
                                        : "text-primary font-medium bg-primary/10"),
                            )}
                        >
                            <Icon size={14} />
                            <span className="flex-1">
                                Xem với vai trò {formatRoleLabel(availableRole)}
                            </span>
                            {selected && (
                                <span
                                    className={cn(
                                        "text-[10px]",
                                        studentRow
                                            ? "text-green-500"
                                            : "text-primary",
                                    )}
                                    aria-hidden
                                >
                                    ●
                                </span>
                            )}
                            {!isAssigned && !selected && (
                                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                                    Xem thử
                                </span>
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
