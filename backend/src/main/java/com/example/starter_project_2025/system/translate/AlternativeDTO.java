package com.example.starter_project_2025.system.translate;

/**
 * An alternative translation shown under the main result (DeepL-style),
 * with its romaji transcription when the target is Japanese.
 */
public record AlternativeDTO(
        String text,
        String romaji
) {
}
