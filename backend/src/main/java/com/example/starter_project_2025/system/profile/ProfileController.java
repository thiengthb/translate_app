package com.example.starter_project_2025.system.profile;

import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.profile.dto.ChangePasswordRequest;
import com.example.starter_project_2025.system.profile.dto.ProfileResponse;
import com.example.starter_project_2025.system.profile.dto.UpdateAvatarRequest;
import com.example.starter_project_2025.system.profile.dto.UpdateProfileRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/profile")
@PreAuthorize("isAuthenticated()")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Profile", description = "APIs for managing the current user's profile")
public class ProfileController {

    ProfileService profileService;

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
}
