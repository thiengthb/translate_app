package com.example.starter_project_2025.base.i18n;

import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Per-request translation lookup for dynamic DB content.
 *
 * Picks the locale from {@link LocaleContextHolder} which Spring populates
 * from the {@code Accept-Language} header (see
 * {@link com.example.starter_project_2025.config.LocaleConfig}).
 *
 * For static UI strings the FE catalog under {@code frontend/src/i18n/messages}
 * is the source of truth. This resolver only translates DB-stored content
 * (module titles, dashboard widget labels, etc.).
 */
@Service
@RequiredArgsConstructor
public class I18nResolver {

    private final TranslationRepository translationRepository;

    /**
     * @return the translation for the active locale, or {@code fallback} if
     *         no row exists or the key is blank.
     */
    public String resolve(String key, String fallback) {
        if (key == null || key.isBlank()) return fallback;

        Locale locale = LocaleContextHolder.getLocale();
        String code = locale != null ? locale.getLanguage() : "";
        if (code.isBlank()) return fallback;

        return translationRepository
                .findByLocaleAndMessageKey(code, key)
                .map(Translation::getMessageValue)
                .filter(v -> !v.isBlank())
                .orElse(fallback);
    }
}
