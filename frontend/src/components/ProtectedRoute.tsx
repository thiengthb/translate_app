import React from "react";
import { Navigate } from "react-router-dom";

import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { usePermissions } from "@/hooks/usePermissions";
import { GuestGate } from "@/components/auth/GuestGate";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  /**
   * Mazii open-access: when true, guests may view this route freely (no auth
   * redirect, no permission check). Used for the public pages (dashboard,
   * dictionary, vocabulary, kanji lookups…). Authenticated users still pass
   * through the normal permission checks below.
   */
  allowGuest?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  allowGuest = false,
}) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  if (!isAuthenticated) {
    // Public page → let guests in as-is.
    if (allowGuest) {
      return <>{children}</>;
    }
    // Personal page → keep the guest on this URL inside the shell and show an
    // in-shell login gate (no forced redirect to /login — Mazii-style).
    return <GuestGate />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermissions?.length) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
