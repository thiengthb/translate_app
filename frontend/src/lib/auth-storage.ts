import { normalizeAuthRolePayload } from "@/utils/rbac.utils";

/**
 * Single source of truth for auth-related localStorage keys + the BE → FE
 * response mapping. Previously the same logic was repeated in axios.ts,
 * auth.api.ts and authSlice.ts → drift waiting to happen.
 */

export interface BackendAuthResponse {
    accessToken: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
    rolePermissions?: Record<string, string[]>;
}

export interface AuthData {
    token: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roles: string[];
    permissions: string[];
    rolePermissions: Record<string, string[]>;
}

const KEYS = [
    "token",
    "email",
    "firstName",
    "lastName",
    "role",
    "roles",
    "permissions",
    "rolePermissions",
] as const;

const parseStringArray = (key: string): string[] => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
        return [];
    }
};

const parseRolePermissions = (): Record<string, string[]> => {
    const raw = localStorage.getItem("rolePermissions");
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return Object.entries(parsed).reduce<Record<string, string[]>>((acc, [role, perms]) => {
            if (Array.isArray(perms)) {
                acc[role] = perms.filter((v): v is string => typeof v === "string");
            }
            return acc;
        }, {});
    } catch {
        return {};
    }
};

/** Convert a backend response into FE-shaped auth data (normalised roles/perms). */
export const mapAuthResponse = (data: BackendAuthResponse): AuthData => {
    const normalised = normalizeAuthRolePayload({
        role: data.role,
        roles: data.roles,
        permissions: data.permissions,
        rolePermissions: data.rolePermissions,
    });
    return {
        token: data.accessToken,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: normalised.role,
        roles: normalised.roles,
        permissions: normalised.permissions,
        rolePermissions: normalised.rolePermissions,
    };
};

export const authStorage = {
    keys: KEYS,

    /** Hydrate auth state from localStorage at app boot. */
    load(): AuthData & { isAuthenticated: boolean } {
        const normalised = normalizeAuthRolePayload({
            role: localStorage.getItem("role") ?? "",
            roles: parseStringArray("roles"),
            permissions: parseStringArray("permissions"),
            rolePermissions: parseRolePermissions(),
        });
        const token = localStorage.getItem("token") ?? "";
        return {
            token,
            email: localStorage.getItem("email") ?? "",
            firstName: localStorage.getItem("firstName") ?? "",
            lastName: localStorage.getItem("lastName") ?? "",
            role: normalised.role,
            roles: normalised.roles,
            permissions: normalised.permissions,
            rolePermissions: normalised.rolePermissions,
            isAuthenticated: !!token,
        };
    },

    /** Persist auth state to localStorage after login/refresh. */
    save(auth: AuthData): void {
        localStorage.setItem("token", auth.token);
        localStorage.setItem("email", auth.email);
        localStorage.setItem("firstName", auth.firstName);
        localStorage.setItem("lastName", auth.lastName);
        localStorage.setItem("role", auth.role);
        localStorage.setItem("roles", JSON.stringify(auth.roles));
        localStorage.setItem("permissions", JSON.stringify(auth.permissions));
        localStorage.setItem("rolePermissions", JSON.stringify(auth.rolePermissions));
    },

    /** Wipe auth state on logout / refresh failure. */
    clear(): void {
        KEYS.forEach((k) => localStorage.removeItem(k));
    },
};
