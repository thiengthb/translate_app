package com.example.starter_project_2025.system.profile;

import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.auth.util.CookieUtil;
import com.example.starter_project_2025.system.profile.dto.ChangePasswordRequest;
import com.example.starter_project_2025.system.profile.dto.DisableTotpRequest;
import com.example.starter_project_2025.system.profile.dto.EnableTotpRequest;
import com.example.starter_project_2025.system.profile.dto.EnableTotpResponse;
import com.example.starter_project_2025.system.profile.dto.ProfileResponse;
import com.example.starter_project_2025.system.profile.dto.SessionResponse;
import com.example.starter_project_2025.system.profile.dto.TotpSetupResponse;
import com.example.starter_project_2025.system.profile.dto.TotpStatusResponse;
import com.example.starter_project_2025.system.profile.dto.UpdateAvatarRequest;
import com.example.starter_project_2025.system.profile.dto.UpdateLocaleRequest;
import com.example.starter_project_2025.system.profile.dto.UpdateProfileRequest;
import com.example.starter_project_2025.system.profile.dto.UpdateThemeRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/profile")
@PreAuthorize("isAuthenticated()")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Profile", description = "APIs for managing the current user's profile")
public class ProfileController {

    ProfileService profileService;
    CookieUtil cookieUtil;

    @GetMapping
    @Operation(summary = "Get current user profile")
    public ResponseEntity<ProfileResponse> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(profileService.getProfile(principal.getUsername()));
    }

    @PatchMapping
    @Operation(summary = "Update profile information")
    public ResponseEntity<ProfileResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(profileService.updateProfile(principal.getUsername(), request));
    }

    @PatchMapping("/password")
    @Operation(summary = "Change password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        profileService.changePassword(principal.getUsername(), request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/avatar")
    @Operation(summary = "Update avatar URL")
    public ResponseEntity<ProfileResponse> updateAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateAvatarRequest request
    ) {
        return ResponseEntity.ok(profileService.updateAvatar(principal.getUsername(), request));
    }

    @PatchMapping("/locale")
    @Operation(summary = "Update preferred locale")
    public ResponseEntity<ProfileResponse> updateLocale(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateLocaleRequest request
    ) {
        return ResponseEntity.ok(profileService.updateLocale(principal.getUsername(), request));
    }

    @PatchMapping("/theme")
    @Operation(summary = "Update preferred theme")
    public ResponseEntity<ProfileResponse> updateTheme(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateThemeRequest request
    ) {
        return ResponseEntity.ok(profileService.updateTheme(principal.getUsername(), request));
    }

    @GetMapping("/sessions")
    @Operation(summary = "List active sessions (one per signed-in device)")
    public ResponseEntity<List<SessionResponse>> listSessions(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        String current = cookieUtil.getRefreshTokenFromCookie(request).orElse(null);
        return ResponseEntity.ok(profileService.listSessions(principal.getUsername(), current));
    }

    @DeleteMapping("/sessions/{id}")
    @Operation(summary = "Revoke a single session by id")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        profileService.revokeSession(principal.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/2fa")
    @Operation(summary = "Current TOTP enrollment status")
    public ResponseEntity<TotpStatusResponse> totpStatus(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(profileService.getTotpStatus(principal.getUsername()));
    }

    @PostMapping("/2fa/setup")
    @Operation(summary = "Start a TOTP enrollment — returns secret + QR")
    public ResponseEntity<TotpSetupResponse> setupTotp(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(profileService.setupTotp(principal.getUsername()));
    }

    @PostMapping("/2fa/enable")
    @Operation(summary = "Confirm enrollment and receive one-time recovery codes")
    public ResponseEntity<EnableTotpResponse> enableTotp(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EnableTotpRequest request
    ) {
        return ResponseEntity.ok(profileService.enableTotp(principal.getUsername(), request));
    }

    @PostMapping("/2fa/disable")
    @Operation(summary = "Disable 2FA — requires current password")
    public ResponseEntity<Void> disableTotp(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody DisableTotpRequest request
    ) {
        profileService.disableTotp(principal.getUsername(), request);
        return ResponseEntity.noContent().build();
    }
}
