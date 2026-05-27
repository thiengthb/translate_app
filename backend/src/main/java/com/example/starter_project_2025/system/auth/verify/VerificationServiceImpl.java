package com.example.starter_project_2025.system.auth.verify;

import com.example.starter_project_2025.exception.TooManyRequestsException;
import com.example.starter_project_2025.system.auth.token.onetime.OneTimeToken;
import com.example.starter_project_2025.system.auth.token.onetime.OneTimeTokenService;
import com.example.starter_project_2025.system.auth.util.EmailThrottle;
import com.example.starter_project_2025.system.auth.util.MailUtil;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VerificationServiceImpl implements VerificationService {

    OneTimeTokenService oneTimeTokenService;
    UserRepository userRepository;
    MailUtil mailUtil;
    EmailThrottle emailThrottle;

    private static final String VERIFICATION_EMAIL = "email/verification_email";
    private static final String RESET_PASSWORD_EMAIL = "email/reset_password_email";

    @NonFinal
    @Value("${app.backend-domain}")
    String backendUrl;

    @NonFinal
    @Value("${app.frontend-domain}")
    String frontendUrl;

    @NonFinal
    @Value("${spring.mail.username}")
    String hostEmail;

    @Override
    public void sendEmailVerification(String email) {
        // First-send path (called by register). No user-facing throttle here:
        // we still mark the timestamp so an immediate resend will respect the
        // cooldown window.
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.debug("sendEmailVerification: no user for email {}", email);
            return;
        }
        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getIsActive())) {
            log.debug("sendEmailVerification: user {} already active, skipping", email);
            return;
        }
        emailThrottle.tryConsume("verify:" + email);
        dispatchVerificationEmail(user);
    }

    @Override
    public void resendVerification(String email) {
        // Throttle check runs BEFORE the user lookup so cooldown semantics
        // are identical for known and unknown emails (anti-enumeration).
        if (!emailThrottle.tryConsume("verify:" + email)) {
            throw new TooManyRequestsException("Please wait before requesting another email.");
        }
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.debug("resendVerification: no user for email {}", email);
            return;
        }
        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getIsActive())) {
            log.debug("resendVerification: user {} already active, skipping", email);
            return;
        }
        dispatchVerificationEmail(user);
    }

    @Override
    @Transactional
    public boolean verifyEmail(String rawToken) {
        OneTimeToken token = oneTimeTokenService.verifyOneTimeToken(rawToken, OneTimeToken.TokenType.EMAIL_VERIFY);
        oneTimeTokenService.markUsed(token);

        User user = token.getUser();
        if (user.getIsActive()) {
            return false;
        }

        user.setIsActive(true);
        userRepository.save(user);
        return true;
    }

    @Override
    public void sendForgotPassword(String email) {
        if (!emailThrottle.tryConsume("reset:" + email)) {
            throw new TooManyRequestsException("Please wait before requesting another email.");
        }
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.debug("sendForgotPassword: no user for email {}", email);
            return;
        }
        User user = userOpt.get();
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            log.debug("sendForgotPassword: user {} not active, skipping", email);
            return;
        }

        String token = oneTimeTokenService.createOneTimeToken(user, OneTimeToken.TokenType.RESET_PASSWORD);
        String resetLink = String.format("%s/forgot-password?token=%s", frontendUrl, token);
        sendResetPasswordMail(user.getEmail(), user.getFullName(), resetLink);
    }

    private void dispatchVerificationEmail(User user) {
        String token = oneTimeTokenService.createOneTimeToken(user, OneTimeToken.TokenType.EMAIL_VERIFY);
        String verificationLink = String.format("%s/verify?token=%s", backendUrl, token);
        sendVerificationEmail(user.getEmail(), user.getFullName(), verificationLink);
    }

    public void sendVerificationEmail(String to, String username, String verificationLink) {
        mailUtil.buildAndSendMail(
                "Verify Email",
                hostEmail,
                to,
                VERIFICATION_EMAIL,
                List.of(
                        Map.entry("username", username),
                        Map.entry("verificationLink", verificationLink)
                )
        );
        log.info("Verification email sent to {}", to);
    }

    public void sendResetPasswordMail(String to, String username, String resetLink) {
        mailUtil.buildAndSendMail(
                "Reset Password",
                hostEmail,
                to,
                RESET_PASSWORD_EMAIL,
                List.of(
                        Map.entry("username", username),
                        Map.entry("resetLink", resetLink)
                )
        );
        log.info("Reset password email sent to {}", to);
    }
}
