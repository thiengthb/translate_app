package com.example.starter_project_2025.system.words.level;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves a JLPT {@link Level} from its code (e.g. {@code "N4"}), with a small
 * in-memory cache. Used by the grammar seeders to attach the shared {@code levels}
 * row instead of storing a free-text level string. Levels are seeded earlier
 * (see {@code WordReferenceDataInitializer}, @Order 11) so lookups always hit.
 */
@Component
@RequiredArgsConstructor
public class LevelLookup {

    private final LevelRepository levelRepository;
    private final Map<String, Level> cache = new ConcurrentHashMap<>();

    /** The {@link Level} for {@code code} (case-insensitive), or {@code null} if unknown. */
    public Level byCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return cache.computeIfAbsent(code.trim().toUpperCase(),
                c -> levelRepository.findByCode(c).orElse(null));
    }
}
