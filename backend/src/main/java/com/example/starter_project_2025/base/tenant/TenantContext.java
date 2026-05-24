package com.example.starter_project_2025.base.tenant;

/**
 * Holds the current tenant ID in a ThreadLocal for request-scoped tenant isolation.
 */
public final class TenantContext {

    private static final ThreadLocal<Long> currentTenant = new ThreadLocal<>();

    private TenantContext() {
    }

    public static Long getCurrentTenant() {
        return currentTenant.get();
    }

    public static void setCurrentTenant(Long tenantId) {
        currentTenant.set(tenantId);
    }

    public static void clear() {
        currentTenant.remove();
    }
}
