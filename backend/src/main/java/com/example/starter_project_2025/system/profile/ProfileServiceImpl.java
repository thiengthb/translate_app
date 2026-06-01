package com.example.starter_project_2025.system.profile;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.system.auth.token.refresh.RefreshToken;
import com.example.starter_project_2025.system.auth.token.refresh.RefreshTokenRepository;
import com.example.starter_project_2025.system.auth.util.TokenUtil;
import com.example.starter_project_2025.system.auth.twofactor.RecoveryCode;
import com.example.starter_project_2025.system.auth.twofactor.RecoveryCodeRepository;
import com.example.starter_project_2025.system.auth.twofactor.TotpService;
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
import com.example.starter_project_2025.system.rbac.role.Role;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProfileServiceImpl implements ProfileService {

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    RefreshTokenRepository refreshTokenRepository;
    TotpService totpService;
    RecoveryCodeRepository recoveryCodeRepository;

    /**
     * Whitelist of locale codes the BE will accept. Keep in sync with the FE
     * `LOCALES` array — any code not in here is rejected with 400.
     */
    public static final Set<String> SUPPORTED_LOCALES = Set.of("en", "vi", "ja");
    public static final Set<String> SUPPORTED_THEMES = Set.of("light", "dark", "system");

    @Override
    public ProfileResponse getProfile(String email) {
        return toResponse(findByEmail(email));
    }

    @Override
    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = findByEmail(email);
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName() != null ? request.lastName().trim() : null);
        user.setPhone(request.phone() != null ? request.phone().trim() : null);
        user.setBio(request.bio() != null ? request.bio().trim() : null);
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("error.profile.passwordMismatch");
        }

        User user = findByEmail(email);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("error.profile.currentPasswordWrong");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("error.profile.newPasswordSame");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public ProfileResponse updateAvatar(String email, UpdateAvatarRequest request) {
        User user = findByEmail(email);
        user.setAvatarUrl(request.avatarUrl());
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public ProfileResponse updateLocale(String email, UpdateLocaleRequest request) {
        String locale = request.locale();
        if (!SUPPORTED_LOCALES.contains(locale)) {
            throw new BadRequestException("error.profile.unsupportedLocale", locale);
        }
        User user = findByEmail(email);
        user.setLocale(locale);
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public ProfileResponse updateTheme(String email, UpdateThemeRequest request) {
        String theme = request.theme();
        if (!SUPPORTED_THEMES.contains(theme)) {
            throw new BadRequestException("error.profile.unsupportedTheme", theme);
        }
        User user = findByEmail(email);
        user.setTheme(theme);
        return toResponse(userRepository.save(user));
    }

    @Override
    public List<SessionResponse> listSessions(String email, String currentRefreshToken) {
        User user = findByEmail(email);
        String currentHash = currentRefreshToken != null ? TokenUtil.hash(currentRefreshToken) : null;

        return refreshTokenRepository
                .findAllByUserIdAndRevokedFalseOrderByLastUsedAtDesc(user.getId())
                .stream()
                .map(t -> new SessionResponse(
                        t.getId(),
                        t.getUserAgent(),
                        t.getIpAddress(),
                        t.getLastUsedAt(),
                        t.getCreatedAt(),
                        Objects.equals(t.getTokenHash(), currentHash)
                ))
                .toList();
    }

    @Override
    public TotpStatusResponse getTotpStatus(String email) {
        User user = findByEmail(email);
        int remaining = (int) recoveryCodeRepository.findAllByUserId(user.getId()).stream()
                .filter(rc -> !rc.isUsed())
                .count();
        return new TotpStatusResponse(Boolean.TRUE.equals(user.getTotpEnabled()), remaining);
    }

    @Override
    @Transactional
    public TotpSetupResponse setupTotp(String email) {
        User user = findByEmail(email);
        // Always issue a fresh secret on setup — if the user re-enrolls we
        // shouldn't reuse the old one. Persisted now but kept inactive until
        // enableTotp() confirms the first code.
        String secret = totpService.newSecret();
        user.setTotpSecret(secret);
        user.setTotpEnabled(false);
        userRepository.save(user);
        return new TotpSetupResponse(secret, totpService.qrDataUri(user, secret));
    }

    @Override
    @Transactional
    public EnableTotpResponse enableTotp(String email, EnableTotpRequest request) {
        User user = findByEmail(email);
        if (user.getTotpSecret() == null) {
            throw new BadRequestException("error.token.invalidType");
        }
        if (!totpService.verify(user.getTotpSecret(), request.code())) {
            throw new BadRequestException("error.token.expired");
        }

        user.setTotpEnabled(true);
        userRepository.save(user);

        // Rotate recovery codes on every (re-)enrollment. Hash before save —
        // we treat them like one-time passwords.
        recoveryCodeRepository.deleteAllByUserId(user.getId());
        List<String> plaintext = totpService.newRecoveryCodes();
        for (String code : plaintext) {
            recoveryCodeRepository.save(RecoveryCode.builder()
                    .user(user)
                    .codeHash(com.example.starter_project_2025.system.auth.util.TokenUtil.hash(code))
                    .used(false)
                    .build());
        }
        return new EnableTotpResponse(plaintext);
    }

    @Override
    @Transactional
    public void disableTotp(String email, DisableTotpRequest request) {
        User user = findByEmail(email);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("error.profile.currentPasswordWrong");
        }
        user.setTotpSecret(null);
        user.setTotpEnabled(false);
        userRepository.save(user);
        recoveryCodeRepository.deleteAllByUserId(user.getId());
    }

    @Override
    @Transactional
    public void revokeSession(String email, Long sessionId) {
        User user = findByEmail(email);
        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new BadRequestException("Session not found"));
        if (!Objects.equals(token.getUser().getId(), user.getId())) {
            // Don't leak which sessions exist; treat as not-found.
            throw new BadRequestException("error.profile.sessionNotFound");
        }
        token.setRevoked(true);
        refreshTokenRepository.save(token);
    }

    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("error.profile.userNotFound"));
    }

    private ProfileResponse toResponse(User user) {
        Set<String> roles = user.getRoles() == null ? new LinkedHashSet<>() :
                user.getRoles().stream()
                        .map(Role::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .sorted()
                        .collect(Collectors.toCollection(LinkedHashSet::new));

        return new ProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getLocale(),
                user.getTheme(),
                roles,
                user.getCreatedAt()
        );
    }
}
