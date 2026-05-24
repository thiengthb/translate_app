package com.example.starter_project_2025.base.i18n;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TranslationService {

    private final TranslationRepository translationRepository;

    public Map<String, String> getTranslations(String locale) {
        List<Translation> translations = translationRepository.findByLocale(locale);
        Map<String, String> result = new HashMap<>();
        for (Translation t : translations) {
            result.put(t.getMessageKey(), t.getMessageValue());
        }
        return result;
    }

    public Map<String, String> getTranslations(String locale, String category) {
        List<Translation> translations = translationRepository.findByLocaleAndCategory(locale, category);
        Map<String, String> result = new HashMap<>();
        for (Translation t : translations) {
            result.put(t.getMessageKey(), t.getMessageValue());
        }
        return result;
    }

    public String translate(String locale, String key) {
        return translationRepository.findByLocaleAndMessageKey(locale, key)
                .map(Translation::getMessageValue)
                .orElse(key);
    }

    public Translation save(Translation translation) {
        return translationRepository.save(translation);
    }
}
