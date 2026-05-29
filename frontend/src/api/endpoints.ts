/**
 * Centralized API path constants. Use these instead of inline strings so
 * a backend rename is one edit and grep finds every reference.
 *
 * Paths are relative to {@code VITE_API_URL} (default `/api`).
 */
export const ENDPOINTS = {
    AUTH: {
        LOGIN: "/auth/login",
        LOGOUT: "/auth/logout",
        REFRESH: "/auth/refresh",
        REGISTER: "/auth/register",
        FORGOT_PASSWORD: "/auth/forgot-password",
        RESET_PASSWORD: "/auth/reset-password",
        RESEND_VERIFICATION: "/auth/resend-verification",
    },
    META: {
        ENTITIES: "/meta/entities",
        ENTITY_BY_NAME: (name: string) => `/meta/entities/${name}`,
    },
    IMPORT: {
        TEMPLATE: (entity: string) => `/import/template?entity=${encodeURIComponent(entity)}`,
    },
    MODULES: "/modules",
    MODULE_GROUPS: "/module-groups",
    USERS: "/users",
    ROLES: "/roles",
    PERMISSIONS: "/permissions",
    BOOKS: "/books",
    TAGS: "/tags",
    DASHBOARD_STATS: "/dashboard/stats",
    AUDIT_LOGS: "/audit-logs",
} as const;
