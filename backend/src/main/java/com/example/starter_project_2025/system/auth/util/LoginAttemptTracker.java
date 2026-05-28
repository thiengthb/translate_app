package com.example.starter_project_2025.system.auth.util;

import com.example.starter_project_2025.exception.TooManyRequestsException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Tracks consecutive failed login attempts per email and triggers a
 * temporary lockout after a threshold.
 *
 * In-memory (Caffeine), single-node only. For HA, back with Redis.
 */
@Component
public class LoginAttemptTracker {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    private final Cache<String, AttemptRecord> attempts = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(30))
            .maximumSize(10_000)
            .build();

    public void assertNotLocked(String email) {
        AttemptRecord rec = attempts.getIfPresent(normalize(email));
        if (rec == null || rec.lockedUntil == null) return;
        Instant now = Instant.now();
        if (rec.lockedUntil.isAfter(now)) {
            long secondsLeft = Math.max(1, Duration.between(now, rec.lockedUntil).toSeconds());
            throw new TooManyRequestsException("error.auth.tooManyAttempts", secondsLeft);
        }
    }

    public synchronized void recordFailure(String email) {
        String key = normalize(email);
        AttemptRecord rec = attempts.getIfPresent(key);
        if (rec == null) rec = new AttemptRecord();
        rec.count++;
        if (rec.count >= MAX_ATTEMPTS) {
            rec.lockedUntil = Instant.now().plus(LOCKOUT_DURATION);
            rec.count = 0;
        }
        attempts.put(key, rec);
    }

    public void recordSuccess(String email) {
        attempts.invalidate(normalize(email));
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static class AttemptRecord {
        int count = 0;
        Instant lockedUntil;
    }
}
