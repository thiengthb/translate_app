package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.language.Language;
import com.example.starter_project_2025.system.words.language.LanguageRepository;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.representation.RepresentationRepository;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word.WordRepository;
import com.example.starter_project_2025.system.words.word_type.WordType;
import com.example.starter_project_2025.system.words.word_type.WordTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Seeds a small Japanese dictionary (representations, levels, languages and a
 * handful of common N5 words with VI/EN meanings + an example) so the
 * Dictionary feature has data to search / feature the first time the app
 * boots on an empty DB (dev H2 wipes on restart).
 *
 * Idempotent: skips entirely once the {@code words} table has rows. The base
 * lookup tables (languages / representations / levels) are upserted by code so
 * re-runs and manual edits don't duplicate them.
 */
@Slf4j
@Order(13)
@Component
@RequiredArgsConstructor
public class DictionaryDataInitializer implements CommandLineRunner {

    private final WordRepository wordRepository;
    private final RepresentationRepository representationRepository;
    private final LevelRepository levelRepository;
    private final LanguageRepository languageRepository;
    private final WordTypeRepository wordTypeRepository;

    /** name | code | description */
    private record SeedWordType(String name, String code, String description) {}

    private static final List<SeedWordType> SEED_WORD_TYPES = List.of(
            new SeedWordType("Noun", "n", "Danh từ"),
            new SeedWordType("Ichidan verb", "v1", "Động từ nhóm 2 (ru-verb)"),
            new SeedWordType("Godan verb", "v5", "Động từ nhóm 1 (u-verb)"),
            new SeedWordType("Suru verb", "vs", "Động từ する"),
            new SeedWordType("I-adjective", "adj-i", "Tính từ đuôi い"),
            new SeedWordType("Na-adjective", "adj-na", "Tính từ đuôi な"),
            new SeedWordType("Adverb", "adv", "Phó từ"),
            new SeedWordType("Pronoun", "pron", "Đại từ"),
            new SeedWordType("Particle", "prt", "Trợ từ"),
            new SeedWordType("Conjunction", "conj", "Liên từ"),
            new SeedWordType("Interjection", "int", "Thán từ"),
            new SeedWordType("Counter", "ctr", "Trợ số từ"),
            new SeedWordType("Prefix", "pref", "Tiền tố"),
            new SeedWordType("Suffix", "suf", "Hậu tố"),
            new SeedWordType("Numeral", "num", "Số từ"),
            new SeedWordType("Expression", "expr", "Cụm từ / thành ngữ")
    );

    /** word | reading | type | repCode | levelCode | VI | EN | exampleJA | exampleVI */
    private record SeedWord(
            String word, String reading, String type, String repCode, String levelCode,
            String vi, String en, String exJa, String exVi) {}

    private static final List<SeedWord> SEED_WORDS = List.of(
            new SeedWord("水", "みず", "n", "kanji", "N5", "nước", "water",
                    "毎日水を飲みます。", "Tôi uống nước mỗi ngày."),
            new SeedWord("食べる", "たべる", "v1", "kanji", "N5", "ăn", "to eat",
                    "朝ご飯を食べる。", "Ăn cơm sáng."),
            new SeedWord("学校", "がっこう", "n", "kanji", "N5", "trường học", "school",
                    "学校へ行きます。", "Tôi đi đến trường."),
            new SeedWord("大きい", "おおきい", "adj-i", "kanji", "N5", "to, lớn", "big",
                    "大きい家ですね。", "Ngôi nhà lớn nhỉ."),
            new SeedWord("友達", "ともだち", "n", "kanji", "N5", "bạn bè", "friend",
                    "友達と話します。", "Tôi nói chuyện với bạn bè."),
            new SeedWord("行く", "いく", "v5", "kanji", "N5", "đi", "to go",
                    "日本へ行きたい。", "Tôi muốn đi Nhật."),
            new SeedWord("本", "ほん", "n", "kanji", "N5", "sách", "book",
                    "本を読みます。", "Tôi đọc sách."),
            new SeedWord("先生", "せんせい", "n", "kanji", "N5", "giáo viên", "teacher",
                    "先生に聞きます。", "Tôi hỏi giáo viên."),
            new SeedWord("日本語", "にほんご", "n", "kanji", "N5", "tiếng Nhật", "Japanese language",
                    "日本語を勉強します。", "Tôi học tiếng Nhật."),
            new SeedWord("ありがとう", "ありがとう", "int", "hiragana", "N5", "cảm ơn", "thank you",
                    "ありがとうございます。", "Cảm ơn rất nhiều."),
            new SeedWord("猫", "ねこ", "n", "kanji", "N5", "con mèo", "cat",
                    "猫が好きです。", "Tôi thích mèo."),
            new SeedWord("新しい", "あたらしい", "adj-i", "kanji", "N5", "mới", "new",
                    "新しい車を買いました。", "Tôi đã mua một chiếc xe mới.")
    );

    @Override
    @Transactional
    public void run(String... args) {
        // Word types (parts of speech) — seeded independently of words.
        if (wordTypeRepository.count() == 0) {
            for (SeedWordType t : SEED_WORD_TYPES) {
                wordTypeRepository.save(WordType.builder()
                        .name(t.name()).code(t.code()).description(t.description())
                        .build());
            }
            log.info("Word type seed: {} types created.", SEED_WORD_TYPES.size());
        }

        if (wordRepository.count() > 0) {
            log.info("Dictionary seed: skipped (words already present).");
            return;
        }

        Language ja = ensureLanguage("ja", "Japanese");
        Language vi = ensureLanguage("vi", "Vietnamese");
        Language en = ensureLanguage("en", "English");

        int created = 0;
        for (int i = 0; i < SEED_WORDS.size(); i++) {
            SeedWord s = SEED_WORDS.get(i);
            Representation rep = ensureRepresentation(s.repCode());
            Level level = ensureLevel(s.levelCode());

            Word word = Word.builder()
                    .word(s.word())
                    .reading(s.reading())
                    .wordType(s.type())
                    .frequency(SEED_WORDS.size() - i) // earlier entries rank "more frequent"
                    .representation(rep)
                    .level(level)
                    .meanings(new ArrayList<>())
                    .examples(new ArrayList<>())
                    .build();

            word.getMeanings().add(Meaning.builder().language(vi).name(s.vi()).word(word).build());
            word.getMeanings().add(Meaning.builder().language(en).name(s.en()).word(word).build());

            word.getExamples().add(Example.builder()
                    .rootLanguage(ja).toLanguage(vi)
                    .rootExample(s.exJa()).toExample(s.exVi())
                    .word(word).build());

            wordRepository.save(word); // cascade ALL persists meanings + examples
            created++;
        }

        log.info("Dictionary seed: {} words created.", created);
    }

    // ─── Upsert-by-code helpers ──────────────────────────────────────────────

    private Language ensureLanguage(String code, String name) {
        return languageRepository.findAll().stream()
                .filter(l -> code.equals(l.getCode()))
                .findFirst()
                .orElseGet(() -> languageRepository.save(
                        Language.builder().code(code).name(name).build()));
    }

    private Representation ensureRepresentation(String code) {
        return representationRepository.findAll().stream()
                .filter(r -> code.equals(r.getCode()))
                .findFirst()
                .orElseGet(() -> representationRepository.save(
                        Representation.builder().code(code).name(capitalize(code)).build()));
    }

    private Level ensureLevel(String code) {
        return levelRepository.findAll().stream()
                .filter(l -> code.equals(l.getCode()))
                .findFirst()
                .orElseGet(() -> levelRepository.save(
                        Level.builder().code(code).name(code).build()));
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
