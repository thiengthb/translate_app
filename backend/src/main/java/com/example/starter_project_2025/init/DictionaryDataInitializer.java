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
            // ── N5 ──────────────────────────────────────────────────────────────────
            new SeedWord("水", "みず", "n", "KANJI", "N5", "nước", "water",
                    "毎日水を飲みます。", "Tôi uống nước mỗi ngày."),
            new SeedWord("食べる", "たべる", "v1", "KANJI", "N5", "ăn", "to eat",
                    "朝ご飯を食べる。", "Ăn cơm sáng."),
            new SeedWord("学校", "がっこう", "n", "KANJI", "N5", "trường học", "school",
                    "学校へ行きます。", "Tôi đi đến trường."),
            new SeedWord("大きい", "おおきい", "adj-i", "KANJI", "N5", "to, lớn", "big",
                    "大きい家ですね。", "Ngôi nhà lớn nhỉ."),
            new SeedWord("友達", "ともだち", "n", "KANJI", "N5", "bạn bè", "friend",
                    "友達と話します。", "Tôi nói chuyện với bạn bè."),
            new SeedWord("行く", "いく", "v5", "KANJI", "N5", "đi", "to go",
                    "日本へ行きたい。", "Tôi muốn đi Nhật."),
            new SeedWord("本", "ほん", "n", "KANJI", "N5", "sách", "book",
                    "本を読みます。", "Tôi đọc sách."),
            new SeedWord("先生", "せんせい", "n", "KANJI", "N5", "giáo viên", "teacher",
                    "先生に聞きます。", "Tôi hỏi giáo viên."),
            new SeedWord("日本語", "にほんご", "n", "KANJI", "N5", "tiếng Nhật", "Japanese language",
                    "日本語を勉強します。", "Tôi học tiếng Nhật."),
            new SeedWord("ありがとう", "ありがとう", "int", "HIRAGANA", "N5", "cảm ơn", "thank you",
                    "ありがとうございます。", "Cảm ơn rất nhiều."),
            new SeedWord("猫", "ねこ", "n", "KANJI", "N5", "con mèo", "cat",
                    "猫が好きです。", "Tôi thích mèo."),
            new SeedWord("新しい", "あたらしい", "adj-i", "KANJI", "N5", "mới", "new",
                    "新しい車を買いました。", "Tôi đã mua một chiếc xe mới."),
            new SeedWord("山", "やま", "n", "KANJI", "N5", "núi", "mountain",
                    "富士山は日本一高い山です。", "Núi Phú Sĩ là ngọn núi cao nhất Nhật Bản."),
            new SeedWord("川", "かわ", "n", "KANJI", "N5", "sông", "river",
                    "この川はとてもきれいです。", "Con sông này rất đẹp."),
            new SeedWord("花", "はな", "n", "KANJI", "N5", "bông hoa", "flower",
                    "桜の花が咲きました。", "Hoa anh đào đã nở."),
            new SeedWord("犬", "いぬ", "n", "KANJI", "N5", "con chó", "dog",
                    "犬と散歩しています。", "Tôi đang đi dạo cùng chó."),
            new SeedWord("見る", "みる", "v1", "KANJI", "N5", "xem, nhìn", "to see, to watch",
                    "テレビを見ます。", "Tôi xem tivi."),
            new SeedWord("話す", "はなす", "v5", "KANJI", "N5", "nói chuyện", "to speak, to talk",
                    "英語で話してください。", "Hãy nói bằng tiếng Anh."),
            new SeedWord("飲む", "のむ", "v5", "KANJI", "N5", "uống", "to drink",
                    "お茶を飲みましょう。", "Hãy uống trà nào."),
            new SeedWord("小さい", "ちいさい", "adj-i", "KANJI", "N5", "nhỏ, bé", "small, little",
                    "この部屋は小さいです。", "Căn phòng này nhỏ."),

            // ── N4 ──────────────────────────────────────────────────────────────────
            new SeedWord("勉強", "べんきょう", "vs", "KANJI", "N4", "học bài", "study",
                    "毎日日本語を勉強します。", "Tôi học tiếng Nhật mỗi ngày."),
            new SeedWord("病院", "びょういん", "n", "KANJI", "N4", "bệnh viện", "hospital",
                    "熱があるので病院へ行きます。", "Tôi bị sốt nên đi bệnh viện."),
            new SeedWord("駅", "えき", "n", "KANJI", "N4", "ga tàu", "train station",
                    "駅はどこですか。", "Ga tàu ở đâu vậy?"),
            new SeedWord("電車", "でんしゃ", "n", "KANJI", "N4", "tàu điện", "train",
                    "電車で通勤します。", "Tôi đi làm bằng tàu điện."),
            new SeedWord("料理", "りょうり", "n", "KANJI", "N4", "nấu ăn, món ăn", "cooking, dish",
                    "日本料理が大好きです。", "Tôi rất thích món ăn Nhật."),
            new SeedWord("旅行", "りょこう", "n", "KANJI", "N4", "du lịch", "travel, trip",
                    "来年、日本へ旅行したい。", "Năm tới tôi muốn du lịch Nhật Bản."),
            new SeedWord("映画", "えいが", "n", "KANJI", "N4", "phim", "movie, film",
                    "映画を見に行きましょう。", "Hãy đi xem phim nhé."),
            new SeedWord("音楽", "おんがく", "n", "KANJI", "N4", "âm nhạc", "music",
                    "音楽を聴きながら勉強します。", "Tôi vừa học vừa nghe nhạc."),
            new SeedWord("便利", "べんり", "adj-na", "KANJI", "N4", "tiện lợi", "convenient, handy",
                    "スマホはとても便利です。", "Điện thoại thông minh rất tiện lợi."),
            new SeedWord("難しい", "むずかしい", "adj-i", "KANJI", "N4", "khó", "difficult, hard",
                    "この問題は難しいです。", "Bài toán này khó."),
            new SeedWord("簡単", "かんたん", "adj-na", "KANJI", "N4", "đơn giản, dễ", "simple, easy",
                    "この料理は簡単に作れます。", "Món ăn này dễ làm."),
            new SeedWord("電話", "でんわ", "n", "KANJI", "N4", "điện thoại", "telephone, phone call",
                    "電話してもいいですか。", "Tôi có thể gọi điện không?"),
            new SeedWord("家族", "かぞく", "n", "KANJI", "N4", "gia đình", "family",
                    "家族と一緒に食事します。", "Tôi ăn cơm cùng gia đình."),
            new SeedWord("運動", "うんどう", "vs", "KANJI", "N4", "vận động, tập thể dục", "exercise, sports",
                    "毎朝運動しています。", "Tôi tập thể dục mỗi sáng."),
            new SeedWord("生活", "せいかつ", "n", "KANJI", "N4", "cuộc sống hàng ngày", "daily life, living",
                    "日本での生活はどうですか。", "Cuộc sống ở Nhật thế nào?"),

            // ── N3 ──────────────────────────────────────────────────────────────────
            new SeedWord("経験", "けいけん", "vs", "KANJI", "N3", "kinh nghiệm", "experience",
                    "海外での経験はとても大切です。", "Kinh nghiệm ở nước ngoài rất quan trọng."),
            new SeedWord("文化", "ぶんか", "n", "KANJI", "N3", "văn hóa", "culture",
                    "日本の文化に興味があります。", "Tôi quan tâm đến văn hóa Nhật Bản."),
            new SeedWord("社会", "しゃかい", "n", "KANJI", "N3", "xã hội", "society",
                    "社会のルールを守りましょう。", "Hãy tuân thủ quy tắc xã hội."),
            new SeedWord("環境", "かんきょう", "n", "KANJI", "N3", "môi trường", "environment",
                    "環境を大切にしてください。", "Hãy bảo vệ môi trường."),
            new SeedWord("変える", "かえる", "v1", "KANJI", "N3", "thay đổi", "to change",
                    "生活習慣を変えたいです。", "Tôi muốn thay đổi thói quen sinh hoạt."),
            new SeedWord("続ける", "つづける", "v1", "KANJI", "N3", "tiếp tục", "to continue",
                    "毎日練習を続けることが大切です。", "Việc tiếp tục luyện tập mỗi ngày rất quan trọng."),
            new SeedWord("気持ち", "きもち", "n", "KANJI", "N3", "cảm xúc, tâm trạng", "feeling, emotion",
                    "あなたの気持ちがよくわかります。", "Tôi rất hiểu cảm xúc của bạn."),
            new SeedWord("関係", "かんけい", "n", "KANJI", "N3", "mối quan hệ", "relationship, connection",
                    "人との関係を大切にします。", "Tôi trân trọng mối quan hệ với mọi người."),
            new SeedWord("成長", "せいちょう", "vs", "KANJI", "N3", "sự trưởng thành, sự tăng trưởng", "growth, development",
                    "子供の成長はとても早いです。", "Sự lớn lên của trẻ em rất nhanh."),
            new SeedWord("問題", "もんだい", "n", "KANJI", "N3", "vấn đề, bài toán", "problem, issue",
                    "この問題を一緒に考えましょう。", "Hãy cùng nhau suy nghĩ về vấn đề này."),

            // ── N2 ──────────────────────────────────────────────────────────────────
            new SeedWord("複雑", "ふくざつ", "adj-na", "KANJI", "N2", "phức tạp", "complex, complicated",
                    "この機械の仕組みは複雑です。", "Cơ chế của cái máy này rất phức tạp."),
            new SeedWord("影響", "えいきょう", "n", "KANJI", "N2", "ảnh hưởng", "influence, effect",
                    "環境が人の考え方に影響します。", "Môi trường ảnh hưởng đến cách suy nghĩ của con người."),
            new SeedWord("確認", "かくにん", "vs", "KANJI", "N2", "xác nhận, kiểm tra", "confirmation, verification",
                    "予約内容を確認してください。", "Hãy xác nhận nội dung đặt chỗ."),
            new SeedWord("議論", "ぎろん", "vs", "KANJI", "N2", "tranh luận, thảo luận", "discussion, debate",
                    "みんなで議論して決めましょう。", "Hãy cùng nhau thảo luận để quyết định."),
            new SeedWord("解決", "かいけつ", "vs", "KANJI", "N2", "giải quyết", "resolution, solution",
                    "この問題の解決策を考えています。", "Tôi đang suy nghĩ về giải pháp cho vấn đề này.")
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
                .filter(r -> code.equalsIgnoreCase(r.getCode()))
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
