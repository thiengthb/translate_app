import ToggleTheme from "@/components/ToggleTheme";
import NotificationCenter from "@/components/notification/NotificationCenter";
import UserMenu from "@/components/layout/UserMenu";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import type { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import { useRoleSwitch } from "@/contexts/RoleSwitchContext";
import { ChevronDown, ShieldCheck, GraduationCap } from "lucide-react";
import {
  formatRoleLabel,
  getHomePathByRole,
  normalizeRole,
  uniqueRoles,
} from "@/utils/rbac.utils";
import { useNavigate } from "react-router-dom";

export default function HeaderRight() {
  const { role, roles } = useSelector((state: RootState) => state.auth);
  const { activeRole, availableRoles, isPreviewMode, setViewRole } = useRoleSwitch();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const primaryRole = normalizeRole(role);
  const assignedRoles = uniqueRoles(roles, primaryRole);
  const canSwitchRole = availableRoles.length > 1;
  const currentRole = activeRole ?? primaryRole;
  const isStudentRole = currentRole === "STUDENT";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!role) {
    return (
      <div className="flex items-center gap-3">
        <ToggleTheme />
      </div>
    );
  }

  if (!canSwitchRole) {
    return (
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="text-sm text-primary bg-primary/15"
        >
          {formatRoleLabel(currentRole)}
        </Badge>

        <NotificationCenter />
        <ToggleTheme />
        <UserMenu />
      </div>
    );
  }

  const switchRole = (nextRole: string) => {
    const normalizedRole = normalizeRole(nextRole);
    setViewRole(normalizedRole === primaryRole ? null : normalizedRole);
    setOpen(false);
    navigate(getHomePathByRole(normalizedRole));
  };

  return (
    <div className="flex items-center gap-3" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${isStudentRole
            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
            }`}
        >
          {isStudentRole ? (
            <GraduationCap size={14} />
          ) : (
            <ShieldCheck size={14} />
          )}
          <span>{formatRoleLabel(currentRole)} View</span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {availableRoles.map((availableRole) => {
              const selected = normalizeRole(availableRole) === currentRole;
              const isAssignedRole = assignedRoles.includes(normalizeRole(availableRole));
              const studentRow = normalizeRole(availableRole) === "STUDENT";

              return (
                <button
                  key={availableRole}
                  onClick={() => switchRole(availableRole)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer ${selected
                    ? studentRow
                      ? "text-green-700 font-medium bg-green-50"
                      : "text-primary font-medium bg-primary/10"
                    : "text-foreground"
                    }`}
                >
                  {studentRow ? <GraduationCap size={15} /> : <ShieldCheck size={15} />}
                  {formatRoleLabel(availableRole)} View
                  {(selected || !isAssignedRole) && (
                    <span className="ml-auto flex items-center gap-2">
                      {selected && (
                        <span className={`text-xs ${studentRow ? "text-green-500" : "text-primary"}`}>
                          ●
                        </span>
                      )}
                      {!isAssignedRole && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Preview
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isPreviewMode && (
        <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
          Preview
        </Badge>
      )}

      <NotificationCenter />
      <ToggleTheme />
      <UserMenu />
    </div >
  );
}
