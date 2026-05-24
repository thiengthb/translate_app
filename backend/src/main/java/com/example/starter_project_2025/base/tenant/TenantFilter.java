package com.example.starter_project_2025.base.tenant;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Extracts tenant ID from request header and sets it in TenantContext.
 */
@Component
@Order(1)
public class TenantFilter implements Filter {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            String tenantHeader = httpRequest.getHeader(TENANT_HEADER);

            if (tenantHeader != null && !tenantHeader.isBlank()) {
                try {
                    Long tenantId = Long.parseLong(tenantHeader.trim());
                    TenantContext.setCurrentTenant(tenantId);
                } catch (NumberFormatException ignored) {
                    // Invalid tenant header, skip
                }
            }

            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
