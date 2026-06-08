package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.words.language.Language;
import com.example.starter_project_2025.system.words.language.LanguageRepository;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.representation.RepresentationRepository;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Order(13)
@Component
@RequiredArgsConstructor
public class WordDataInitializer implements CommandLineRunner {

    private final LanguageRepository languageRepository;
    private final LevelRepository levelRepository;
    private final RepresentationRepository representationRepository;
    private final WordRepository wordRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Language ja = ensureLanguage("ja", "Japanese");
        Language vi = ensureLanguage("vi", "Vietnamese");
        Level n5 = ensureLevel("N5", "JLPT N5");
        Level n4 = ensureLevel("N4", "JLPT N4");
        Representation general = ensureRepresentation("general", "一般");

        Set<String> existing = wordRepository.findAll().stream()
                .filter(w -> !Boolean.TRUE.equals(w.getIsDeleted()))
                .map(Word::getWord)
                .collect(Collectors.toSet());

        int created = 0;

        // ── Chủ đề 1: Gia đình (Family) ──────────────────────────────────────
        created += save(existing, general, n5, "家族", "かぞく", "noun", ja, "家族", vi, "gia đình");
        created += save(existing, general, n5, "お父さん", "おとうさん", "noun", ja, "父", vi, "bố / cha");
        created += save(existing, general, n5, "お母さん", "おかあさん", "noun", ja, "母", vi, "mẹ");
        created += save(existing, general, n5, "兄", "あに", "noun", ja, "兄", vi, "anh trai");
        created += save(existing, general, n5, "姉", "あね", "noun", ja, "姉", vi, "chị gái");
        created += save(existing, general, n5, "弟", "おとうと", "noun", ja, "弟", vi, "em trai");
        created += save(existing, general, n5, "妹", "いもうと", "noun", ja, "妹", vi, "em gái");
        created += save(existing, general, n5, "子供", "こども", "noun", ja, "子供", vi, "trẻ em / con cái");
        created += save(existing, general, n4, "親", "おや", "noun", ja, "親", vi, "bậc cha mẹ");
        created += save(existing, general, n4, "夫婦", "ふうふ", "noun", ja, "夫婦", vi, "vợ chồng");

        // ── Chủ đề 2: Thực phẩm (Food) ───────────────────────────────────────
        created += save(existing, general, n5, "ご飯", "ごはん", "noun", ja, "食事・米", vi, "cơm / bữa ăn");
        created += save(existing, general, n5, "水", "みず", "noun", ja, "水", vi, "nước");
        created += save(existing, general, n5, "肉", "にく", "noun", ja, "肉", vi, "thịt");
        created += save(existing, general, n5, "魚", "さかな", "noun", ja, "魚", vi, "cá");
        created += save(existing, general, n5, "野菜", "やさい", "noun", ja, "野菜", vi, "rau củ");
        created += save(existing, general, n5, "果物", "くだもの", "noun", ja, "果物", vi, "trái cây");
        created += save(existing, general, n5, "卵", "たまご", "noun", ja, "卵", vi, "trứng");
        created += save(existing, general, n5, "パン", "ぱん", "noun", ja, "パン", vi, "bánh mì");
        created += save(existing, general, n4, "料理", "りょうり", "noun", ja, "料理", vi, "món ăn / nấu ăn");
        created += save(existing, general, n4, "飲み物", "のみもの", "noun", ja, "飲み物", vi, "đồ uống");

        // ── Chủ đề 3: Thời gian (Time) ───────────────────────────────────────
        created += save(existing, general, n5, "今日", "きょう", "noun", ja, "今日", vi, "hôm nay");
        created += save(existing, general, n5, "明日", "あした", "noun", ja, "明日", vi, "ngày mai");
        created += save(existing, general, n5, "昨日", "きのう", "noun", ja, "昨日", vi, "hôm qua");
        created += save(existing, general, n5, "朝", "あさ", "noun", ja, "朝", vi, "buổi sáng");
        created += save(existing, general, n5, "夜", "よる", "noun", ja, "夜", vi, "buổi tối");
        created += save(existing, general, n5, "週末", "しゅうまつ", "noun", ja, "週末", vi, "cuối tuần");
        created += save(existing, general, n5, "毎日", "まいにち", "adverb", ja, "毎日", vi, "mỗi ngày");
        created += save(existing, general, n4, "来週", "らいしゅう", "noun", ja, "来週", vi, "tuần tới");
        created += save(existing, general, n4, "先月", "せんげつ", "noun", ja, "先月", vi, "tháng trước");
        created += save(existing, general, n4, "時間", "じかん", "noun", ja, "時間", vi, "thời gian / giờ");

        // ── Chủ đề 4: Nơi chốn (Places) ──────────────────────────────────────
        created += save(existing, general, n5, "家", "いえ", "noun", ja, "家", vi, "nhà");
        created += save(existing, general, n5, "学校", "がっこう", "noun", ja, "学校", vi, "trường học");
        created += save(existing, general, n5, "病院", "びょういん", "noun", ja, "病院", vi, "bệnh viện");
        created += save(existing, general, n5, "駅", "えき", "noun", ja, "駅", vi, "nhà ga");
        created += save(existing, general, n5, "銀行", "ぎんこう", "noun", ja, "銀行", vi, "ngân hàng");
        created += save(existing, general, n5, "図書館", "としょかん", "noun", ja, "図書館", vi, "thư viện");
        created += save(existing, general, n5, "公園", "こうえん", "noun", ja, "公園", vi, "công viên");
        created += save(existing, general, n4, "空港", "くうこう", "noun", ja, "空港", vi, "sân bay");
        created += save(existing, general, n4, "会社", "かいしゃ", "noun", ja, "会社", vi, "công ty");
        created += save(existing, general, n4, "郵便局", "ゆうびんきょく", "noun", ja, "郵便局", vi, "bưu điện");

        // ── Chủ đề 5: Hoạt động hàng ngày (Daily Actions) ────────────────────
        created += save(existing, general, n5, "食べる", "たべる", "verb", ja, "食べる", vi, "ăn");
        created += save(existing, general, n5, "飲む", "のむ", "verb", ja, "飲む", vi, "uống");
        created += save(existing, general, n5, "寝る", "ねる", "verb", ja, "寝る", vi, "ngủ");
        created += save(existing, general, n5, "起きる", "おきる", "verb", ja, "起きる", vi, "thức dậy");
        created += save(existing, general, n5, "行く", "いく", "verb", ja, "行く", vi, "đi");
        created += save(existing, general, n5, "来る", "くる", "verb", ja, "来る", vi, "đến / tới");
        created += save(existing, general, n5, "勉強する", "べんきょうする", "verb", ja, "勉強する", vi, "học");
        created += save(existing, general, n4, "働く", "はたらく", "verb", ja, "働く", vi, "làm việc");
        created += save(existing, general, n4, "掃除する", "そうじする", "verb", ja, "掃除する", vi, "dọn dẹp");
        created += save(existing, general, n4, "買い物する", "かいものする", "verb", ja, "買い物する", vi, "đi mua sắm");

        log.info("WordDataInitializer: {} word(s) seeded.", created);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Language ensureLanguage(String code, String name) {
        return languageRepository.findAll().stream()
                .filter(l -> code.equals(l.getCode()))
                .findFirst()
                .orElseGet(() -> languageRepository.save(Language.builder().code(code).name(name).build()));
    }

    private Level ensureLevel(String code, String name) {
        return levelRepository.findAll().stream()
                .filter(l -> code.equals(l.getCode()))
                .findFirst()
                .orElseGet(() -> levelRepository.save(Level.builder().code(code).name(name).build()));
    }

    private Representation ensureRepresentation(String code, String name) {
        return representationRepository.findAll().stream()
                .filter(r -> code.equals(r.getCode()))
                .findFirst()
                .orElseGet(() -> representationRepository.save(Representation.builder().code(code).name(name).build()));
    }

    private int save(Set<String> existing, Representation rep, Level level,
                     String word, String reading, String wordType,
                     Language jaLang, String jaMeaning, Language viLang, String viMeaning) {
        if (existing.contains(word)) return 0;

        List<Meaning> meanings = new ArrayList<>();
        Word entity = Word.builder()
                .word(word)
                .reading(reading)
                .wordType(wordType)
                .representation(rep)
                .level(level)
                .meanings(meanings)
                .examples(new ArrayList<>())
                .build();

        meanings.add(Meaning.builder().language(jaLang).name(jaMeaning).word(entity).build());
        meanings.add(Meaning.builder().language(viLang).name(viMeaning).word(entity).build());

        wordRepository.save(entity);
        return 1;
    }
}
