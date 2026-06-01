package com.example.starter_project_2025.system.profile;

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

import java.util.List;

public interface ProfileService {
    ProfileResponse getProfile(String email);
    ProfileResponse updateProfile(String email, UpdateProfileRequest request);
    void changePassword(String email, ChangePasswordRequest request);
    ProfileResponse updateAvatar(String email, UpdateAvatarRequest request);
    ProfileResponse updateLocale(String email, UpdateLocaleRequest request);
    ProfileResponse updateTheme(String email, UpdateThemeRequest request);
    List<SessionResponse> listSessions(String email, String currentRefreshToken);
    void revokeSession(String email, Long sessionId);

    TotpStatusResponse getTotpStatus(String email);
    TotpSetupResponse setupTotp(String email);
    EnableTotpResponse enableTotp(String email, EnableTotpRequest request);
    void disableTotp(String email, DisableTotpRequest request);
}
