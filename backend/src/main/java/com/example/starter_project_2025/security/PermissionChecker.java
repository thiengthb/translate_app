package com.example.starter_project_2025.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Small utility for checking permissions from non-CRUD entry points
 * (controllers that don't go through {@code BaseCrudServiceImpl.check}).
 */
public final class PermissionChecker {

    private PermissionChecker() {
    }

    public static void require(String permission) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Unauthorized");
        }

        boolean allowed = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(permission));

        if (!allowed) {
            throw new AccessDeniedException("Missing permission: " + permission);
        }
    }

    public static boolean has(String permission) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(permission));
    }
}
