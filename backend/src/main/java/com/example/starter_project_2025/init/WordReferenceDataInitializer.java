package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.words.language.Language;
import com.example.starter_project_2025.system.words.language.LanguageRepository;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.representation.RepresentationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Order(11)
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WordReferenceDataInitializer implements CommandLineRunner {

    LanguageRepository languageRepository;
    LevelRepository levelRepository;
    RepresentationRepository representationRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedLanguages();
        seedLevels();
        seedRepresentations();
        log.info("Word reference data initialized: languages, levels, representations.");
    }

    private void seedLanguages() {
        record LangSpec(String code, String name) {}
        List<LangSpec> specs = List.of(
                new LangSpec("ja", "Tiếng Nhật"),
                new LangSpec("vi", "Tiếng Việt"),
                new LangSpec("en", "Tiếng Anh"),
                new LangSpec("zh", "Tiếng Trung"),
                new LangSpec("ko", "Tiếng Hàn")
        );
        for (LangSpec s : specs) {
            if (languageRepository.existsByCode(s.code())) continue;
            Language lang = new Language();
            lang.setCode(s.code());
            lang.setName(s.name());
            lang.setIsActive(true);
            languageRepository.save(lang);
        }
    }

    private void seedLevels() {
        record LevelSpec(String code, String name) {}
        List<LevelSpec> specs = List.of(
                new LevelSpec("N5", "Sơ cấp"),
                new LevelSpec("N4", "Sơ trung cấp"),
                new LevelSpec("N3", "Trung cấp"),
                new LevelSpec("N2", "Trung cao cấp"),
                new LevelSpec("N1", "Cao cấp")
        );
        for (LevelSpec s : specs) {
            if (levelRepository.existsByCode(s.code())) continue;
            Level level = new Level();
            level.setCode(s.code());
            level.setName(s.name());
            level.setIsActive(true);
            levelRepository.save(level);
        }
    }

    private void seedRepresentations() {
        record RepSpec(String code, String name) {}
        List<RepSpec> specs = List.of(
                new RepSpec("KANJI", "Chữ Hán"),
                new RepSpec("HIRAGANA", "Hiragana"),
                new RepSpec("KATAKANA", "Katakana"),
                new RepSpec("MIXED", "Hỗn hợp")
        );
        for (RepSpec s : specs) {
            if (representationRepository.existsByCode(s.code())) continue;
            Representation rep = new Representation();
            rep.setCode(s.code());
            rep.setName(s.name());
            rep.setIsActive(true);
            representationRepository.save(rep);
        }
    }
}