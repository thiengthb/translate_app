package com.example.starter_project_2025.system.auth.authentication;

import com.example.starter_project_2025.system.auth.authentication.dto.response.AuthenticationResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Current-user endpoint. The access token is kept intentionally small (it no longer carries the
 * user's roles/permissions), so after a password login OR a Google OAuth redirect the client
 * fetches its authorization payload here. Lives OUTSIDE /api/auth on purpose: JwtAuthenticationFilter
 * skips /api/auth/** (login/refresh need no bearer), whereas /api/me must be authenticated.
 */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeController {

    AuthService authService;

    @GetMapping
    public ResponseEntity<AuthenticationResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.getCurrentUser(authentication.getName()));
    }
}
