package com.example.starter_project_2025.system.auth.twofactor;

import com.example.starter_project_2025.system.auth.util.TokenUtil;
import com.example.starter_project_2025.system.rbac.user.User;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Thin wrapper over the samstevens.totp library — owns secret generation,
 * QR provisioning URIs, code verification, and recovery code minting.
 *
 * Issuer label embedded in the QR shows up in authenticator apps as the
 * account name. Defaults to "RBAC System" but can be overridden via
 * {@code app.totp.issuer} so each deployment can brand its own.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TotpService {

    private static final int RECOVERY_CODES_COUNT = 10;
    /** Length of the raw recovery code string (before hashing). */
    private static final int RECOVERY_CODE_LEN = 10;

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final TimeProvider timeProvider = new SystemTimeProvider();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
    private final QrGenerator qrGenerator = new ZxingPngQrGenerator();
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.totp.issuer:Hanabun}")
    private String issuer;

    /** Generate a fresh Base32 secret to give the user during 2FA setup. */
    public String newSecret() {
        return secretGenerator.generate();
    }

    /**
     * Build a {@code data:image/png;base64,...} URL the FE can embed in an
     * &lt;img&gt; tag — saves us serving a binary endpoint just for the QR.
     */
    public String qrDataUri(User user, String secret) {
        QrData data = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer(issuer)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
        try {
            byte[] png = qrGenerator.generate(data);
            return "data:" + qrGenerator.getImageMimeType() + ";base64,"
                    + Base64.getEncoder().encodeToString(png);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to render TOTP QR", e);
        }
    }

    /**
     * @return true if {@code code} is a valid TOTP for {@code secret} in the
     *         current ±1-step window.
     */
    public boolean verify(String secret, String code) {
        if (secret == null || code == null) return false;
        return codeVerifier.isValidCode(secret, code.trim());
    }

    /**
     * Generate {@link #RECOVERY_CODES_COUNT} cryptographically random codes.
     * Caller hashes via {@link TokenUtil#hash(String)} before persisting and
     * returns the plaintext list to the user once.
     */
    public List<String> newRecoveryCodes() {
        List<String> out = new ArrayList<>(RECOVERY_CODES_COUNT);
        for (int i = 0; i < RECOVERY_CODES_COUNT; i++) {
            out.add(randomCode());
        }
        return out;
    }

    private String randomCode() {
        // Alpha + digit alphabet — readable, no easily confused glyphs (0/O, 1/l, etc.).
        final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(RECOVERY_CODE_LEN + 1);
        for (int i = 0; i < RECOVERY_CODE_LEN; i++) {
            if (i == RECOVERY_CODE_LEN / 2) sb.append('-');
            sb.append(alphabet.charAt(secureRandom.nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
