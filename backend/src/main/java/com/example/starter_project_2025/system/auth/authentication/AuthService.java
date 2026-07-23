package com.example.starter_project_2025.system.auth.authentication;

import com.example.starter_project_2025.system.auth.authentication.dto.request.*;
import com.example.starter_project_2025.system.auth.authentication.dto.response.AuthenticationResponse;

public interface AuthService {

    AuthenticationResponse login(LoginRequest request);

    AuthenticationResponse completeTwoFactor(TwoFactorLoginRequest request);

    AuthenticationResponse loginWithGoogle(String email, String firstName, String lastName);

    /** Current authenticated user's profile + roles/permissions (no tokens) — the payload the
     *  client fetches after login/OAuth now that the access token no longer carries it. */
    AuthenticationResponse getCurrentUser(String email);

    void register(RegisterRequest request);

    AuthenticationResponse refresh(TokenRequest request);

    void logout(TokenRequest request);

    void logoutAllDevices();

    void resetPassword(ResetPasswordRequest request);

}
