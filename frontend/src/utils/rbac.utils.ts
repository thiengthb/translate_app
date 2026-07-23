export const ADMIN_ROLE = "ADMIN";
export const STUDENT_ROLE = "STUDENT";
export const TEACHER_ROLE = "TEACHER";

export type RolePermissionsMap = Record<string, string[]>;

type AuthRolePayload = {
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
  rolePermissions?: Record<string, unknown> | null;
};

export const normalizeRole = (role?: string | null): string =>
  (role ?? "").trim().toUpperCase();

export const normalizePermission = (permission?: string | null): string =>
  (permission ?? "").trim().toUpperCase();

export const uniquePermissions = (permissions?: string[] | null): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  const source = Array.isArray(permissions) ? permissions : [];

  for (const permission of source) {
    const item = normalizePermission(permission);
    if (!item || seen.has(item)) {
      continue;
    }

    seen.add(item);
    normalized.push(item);
  }

  return normalized;
};

export const uniqueRoles = (roles?: string[] | null, fallbackRole?: string): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  const source = Array.isArray(roles) ? roles : [];

  for (const role of source) {
    const item = normalizeRole(role);
    if (!item || seen.has(item)) {
      continue;
    }

    seen.add(item);
    normalized.push(item);
  }

  const fallback = normalizeRole(fallbackRole);
  if (fallback && !seen.has(fallback)) {
    normalized.unshift(fallback);
  }

  return normalized;
};

export const normalizeRolePermissionsMap = (
  rolePermissions?: Record<string, unknown> | null,
): RolePermissionsMap => {
  const normalizedMap: RolePermissionsMap = {};

  for (const [role, permissions] of Object.entries(rolePermissions ?? {})) {
    const roleName = normalizeRole(role);
    if (!roleName) {
      continue;
    }

    normalizedMap[roleName] = uniquePermissions(
      Array.isArray(permissions) ? permissions : [],
    );
  }

  return normalizedMap;
};

export const normalizeAuthRolePayload = (payload: AuthRolePayload) => {
  const permissions = uniquePermissions(payload.permissions ?? []);
  const role = normalizeRole(payload.role);
  const roles = uniqueRoles(payload.roles ?? [], role);
  const rolePermissions = normalizeRolePermissionsMap(payload.rolePermissions);

  if (role && !rolePermissions[role]) {
    rolePermissions[role] = [...permissions];
  }

  for (const item of roles) {
    if (!rolePermissions[item]) {
      rolePermissions[item] = item === role ? [...permissions] : [];
    }
  }

  const resolvedRole = role || roles[0] || "";
  if (resolvedRole && !roles.includes(resolvedRole)) {
    roles.unshift(resolvedRole);
  }

  if (resolvedRole && !rolePermissions[resolvedRole]) {
    rolePermissions[resolvedRole] = [...permissions];
  }

  return {
    role: resolvedRole,
    roles,
    permissions,
    rolePermissions,
  };
};

/**
 * Returns the permissions that should be active given the currently selected
 * role.
 *
 * Trust order:
 *  1. If the BE sent {@code rolePermissions[role]} for this role → use it.
 *     This is the canonical source — RoleDataInitializer + JWT claims drive it.
 *  2. Otherwise → fall back to the user's full permission set. This handles
 *     the case where ADMIN preview-switches to a role the BE didn't ship
 *     permissions for; the UI degrades to "show all" rather than silently
 *     hiding everything.
 */
export const resolveEffectivePermissions = (
  activeRole: string | null,
  rolePermissions: RolePermissionsMap,
  allPermissions: string[],
): string[] => {
  const role = normalizeRole(activeRole);

  if (role && rolePermissions[role]?.length) {
    return uniquePermissions(rolePermissions[role]);
  }

  return uniquePermissions(allPermissions);
};

const ROLE_LABELS_VI: Record<string, string> = {
  ADMIN: "Quản trị viên",
  STUDENT: "Học viên",
  TEACHER: "Giáo viên",
};

export const formatRoleLabel = (role: string): string => {
  const normalized = normalizeRole(role);
  return (
    ROLE_LABELS_VI[normalized] ??
    normalized
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

/**
 * Every role lands on the Sakura dashboard — it is role-aware itself
 * (missions/quick actions adapt to the viewer's permissions), so the old
 * per-role landing stubs (/student, /teacher) were retired.
 */
export const getHomePathByRole = (_role?: string | null): string =>
  "/dashboard";

export const canAccessByPermission = (
  requiredPermission: string | undefined,
  hasPermission: (permission: string) => boolean,
): boolean => {
  if (!requiredPermission) {
    return true;
  }

  return hasPermission(requiredPermission);
};
