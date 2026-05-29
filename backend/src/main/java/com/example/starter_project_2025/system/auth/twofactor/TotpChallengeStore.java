package com.example.starter_project_2025.system.auth.twofactor;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

/**
 * Holds a pending TOTP login challenge — the gap between "password verified"
 * and "TOTP verified". When the user passes step 1 we hand the FE an opaque
 * {@code tempToken} pointing at the email here; step 2 consumes it.
 *
 * In-memory single-node (Caffeine). For multi-instance deployments swap to
 * Redis with the same surface.
 */
@Component
public class TotpChallengeStore {

    private static final Duration TTL = Duration.ofMinutes(5);
    private final SecureRandom random = new SecureRandom();

    private final Cache<String, String> challenges = Caffeine.newBuilder()
            .expireAfterWrite(TTL)
            .maximumSize(10_000)
            .build();

    /** Mint a fresh opaque token bound to {@code email} and return it. */
    public String issue(String email) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        challenges.put(token, email);
        return token;
    }

    /**
     * Look up the email for a token without consuming it. Returns empty if
     * unknown or expired.
     */
    public Optional<String> peek(String token) {
        return Optional.ofNullable(challenges.getIfPresent(token));
    }

    /** Invalidate after a successful step-2 verification. */
    public void consume(String token) {
        challenges.invalidate(token);
    }
}
