package com.example.starter_project_2025.system.auth.util;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Per-key minimum-interval throttle for outbound emails
 * (verification resends, password-reset links).
 *
 * Stores the last-sent timestamp per normalized key in an in-memory
 * Caffeine cache. Single-node only; for multi-instance deployments
 * back this with Redis.
 */
@Component
public class EmailThrottle {

    public static final Duration DEFAULT_INTERVAL = Duration.ofSeconds(60);

    private final Cache<String, Instant> lastSent = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(10))
            .maximumSize(10_000)
            .build();

    public boolean tryConsume(String key) {
        return tryConsume(key, DEFAULT_INTERVAL);
    }

    public synchronized boolean tryConsume(String key, Duration interval) {
        String norm = normalize(key);
        Instant now = Instant.now();
        Instant prev = lastSent.getIfPresent(norm);
        if (prev != null && Duration.between(prev, now).compareTo(interval) < 0) {
            return false;
        }
        lastSent.put(norm, now);
        return true;
    }

    private String normalize(String key) {
        return key == null ? "" : key.trim().toLowerCase();
    }
}
