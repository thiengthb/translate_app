package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.analyze.SudachiToken;
import com.example.starter_project_2025.system.analyze.SudachiTokenizer;
import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.kanji.KanjiRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word_kanji.WordKanji;
import com.example.starter_project_2025.system.words.word_kanji.WordKanjiRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DictionaryServiceImpl implements DictionaryService {

    DictionarySearchRepository searchRepository;
    KanjiRepository            kanjiRepository;
    WordKanjiRepository        wordKanjiRepository;
    SudachiTokenizer           tokenizer;

    @Override
    public List<WordSearchResult> search(String query, int limit) {
        String q    = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        List<Word> words = searchRepository.search(q, kana, PageRequest.of(0, limit));

        // Deinflection fallback: tra trực tiếp không ra → có thể user gõ dạng đã
        // chia (食べました, 行かなかった, 高くない…). Dùng Sudachi đưa về base form
        // (原形) rồi tra lại. Chỉ chạy khi rỗng để khỏi tốn cost ở case thường.
        if (words.isEmpty()) {
            words = searchByDeinflection(q, limit);
        }

        return words.stream().map(this::toWordResult).toList();
    }

    /**
     * Coi {@code q} là một (cụm) từ đang chia thể: tokenize bằng Sudachi, gom
     * base form của các động từ (動詞) / tính từ (形容詞), rồi tra lại từng base
     * form và gộp kết quả (dedup theo id, giữ thứ tự xuất hiện).
     * Bỏ qua input không chứa chữ Nhật (romaji / nghĩa) để tránh tokenize vô ích.
     */
    private List<Word> searchByDeinflection(String q, int limit) {
        if (!containsJapanese(q)) {
            return List.of();
        }

        List<String> baseForms = new ArrayList<>();
        for (SudachiToken t : tokenizer.tokenize(q)) {
            String pos  = t.getPartOfSpeechLevel1();
            String base = t.getBaseForm();
            boolean inflectable = "動詞".equals(pos) || "形容詞".equals(pos);
            if (inflectable && base != null && !base.isBlank()
                    && !"*".equals(base) && !base.equals(q) && !baseForms.contains(base)) {
                baseForms.add(base);
            }
        }
        if (baseForms.isEmpty()) {
            return List.of();
        }

        LinkedHashMap<Long, Word> merged = new LinkedHashMap<>();
        for (String base : baseForms) {
            for (Word w : searchRepository.search(base, base, PageRequest.of(0, limit))) {
                merged.putIfAbsent(w.getId(), w);
            }
            if (merged.size() >= limit) break;
        }
        return new ArrayList<>(merged.values());
    }

    @Override
    public WordSearchResult getById(Long id) {
        return searchRepository.findById(id)
                .filter(w -> Boolean.FALSE.equals(w.getIsDeleted()))
                .map(this::toWordResult)
                .orElseThrow(() -> new ResourceNotFoundException("Word", "id", id));
    }

    @Override
    public List<WordSuggestion> suggest(String query, int limit) {
        String q    = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        return searchRepository.suggest(q, kana, PageRequest.of(0, limit))
                               .stream().map(this::toSuggestion).toList();
    }

    @Override
    public List<KanjiSearchResult> searchKanji(String query, int limit) {
        String q    = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        Set<String> queryKanjiChars = extractKanjiChars(q);

        LinkedHashMap<String, Kanji> kanjiMap = new LinkedHashMap<>();

        // ── Step 1: Direct character lookup (user typed kanji directly) ──
        if (!queryKanjiChars.isEmpty()) {
            for (Kanji k : kanjiRepository.findByCharacterInAndIsDeletedFalse(queryKanjiChars)) {
                kanjiMap.put(k.getCharacter(), k);
            }
        }

        // ── Step 2: Keyword search in kanji table ─────────────────────
        //    Matches character / meaning / onyomi / kunyomi (both q and kana form)
        if (kanjiMap.size() < limit) {
            String likeQ    = "%" + q    + "%";
            String likeKana = "%" + kana + "%";
            for (Kanji k : kanjiRepository.searchByKeyword(likeQ, likeKana, PageRequest.of(0, limit))) {
                kanjiMap.putIfAbsent(k.getCharacter(), k);
                if (kanjiMap.size() >= limit) break;
            }
        }

        // ── Step 3: Cross-reference via word search ───────────────────
        //    Helps for inputs like romaji "seijin" → finds word 成人 → 成,人
        if (kanjiMap.isEmpty()) {
            List<Word> words = searchRepository.search(q, kana, PageRequest.of(0, 5));
            Set<String> charsFromWords = new LinkedHashSet<>();
            for (Word w : words) charsFromWords.addAll(extractKanjiChars(w.getWord()));
            if (!charsFromWords.isEmpty()) {
                for (Kanji k : kanjiRepository.findByCharacterInAndIsDeletedFalse(charsFromWords)) {
                    kanjiMap.put(k.getCharacter(), k);
                    if (kanjiMap.size() >= limit) break;
                }
            }
        }

        return kanjiMap.values().stream()
                .limit(limit)
                .map(this::toKanjiResult)
                .toList();
    }

    @Override
    public FeaturedResult featured(int wordLimit, int kanjiLimit) {
        List<Word> words = searchRepository.findFeaturedWords(PageRequest.of(0, wordLimit));
        List<Kanji> kanjis = kanjiRepository.findFeaturedKanjis(PageRequest.of(0, kanjiLimit));

        return FeaturedResult.builder()
                .words(words.stream().map(this::toWordResult).toList())
                .kanjis(kanjis.stream().map(k -> KanjiSearchResult.builder()
                        .character(k.getCharacter())
                        .meaning(k.getMeaning())
                        .onyomi(k.getOnyomi())
                        .kunyomi(k.getKunyomi())
                        .stroke(k.getStroke())
                        .radical(k.getRadical())
                        .jlptLevel(k.getJlptLevel())
                        .words(List.of())
                        .build()).toList())
                .build();
    }

    @Override
    public BrowseResult<WordSearchResult> browseWords(String level, int page, int size) {
        Page<Word> result = searchRepository.browse(normalizeLevel(level), PageRequest.of(page, size));
        return BrowseResult.<WordSearchResult>builder()
                .items(result.getContent().stream().map(this::toWordResult).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Override
    public BrowseResult<KanjiSearchResult> browseKanjis(String level, int page, int size) {
        Page<Kanji> result = kanjiRepository.browse(normalizeLevel(level), PageRequest.of(page, size));
        // Không kèm danh sách từ liên quan (như featured) để tránh N+1 khi duyệt trang dài.
        return BrowseResult.<KanjiSearchResult>builder()
                .items(result.getContent().stream()
                        .map(k -> KanjiSearchResult.builder()
                                .character(k.getCharacter())
                                .meaning(k.getMeaning())
                                .onyomi(k.getOnyomi())
                                .kunyomi(k.getKunyomi())
                                .stroke(k.getStroke())
                                .radical(k.getRadical())
                                .jlptLevel(k.getJlptLevel())
                                .words(List.of())
                                .build())
                        .toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    /** "" / "ALL" → null (không lọc); còn lại chuẩn hóa N5…N1 về chữ hoa. */
    private static String normalizeLevel(String level) {
        if (level == null || level.isBlank() || "ALL".equalsIgnoreCase(level.trim())) {
            return null;
        }
        return level.trim().toUpperCase();
    }

    // ── Helpers ────────────────────────────────────────────────────────

    /** True nếu chuỗi có ít nhất một ký tự hiragana / katakana / kanji. */
    private static boolean containsJapanese(String s) {
        for (int i = 0; i < s.length(); i++) {
            Character.UnicodeBlock block = Character.UnicodeBlock.of(s.charAt(i));
            if (Character.UnicodeBlock.HIRAGANA.equals(block)
                    || Character.UnicodeBlock.KATAKANA.equals(block)
                    || Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS.equals(block)) {
                return true;
            }
        }
        return false;
    }

    private static Set<String> extractKanjiChars(String s) {
        Set<String> result = new LinkedHashSet<>();
        for (char c : s.toCharArray()) {
            if (Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS.equals(Character.UnicodeBlock.of(c))) {
                result.add(String.valueOf(c));
            }
        }
        return result;
    }

    // ── Mappers ────────────────────────────────────────────────────────
    // toWordResult / toKanjiResult là public (khai báo trên interface) để
    // NotebookService tái sử dụng — sổ tay trả về đúng shape của search.

    @Override
    public KanjiSearchResult toKanjiResult(Kanji k) {
        List<KanjiSearchResult.WordInfo> relatedWords = wordKanjiRepository
                .findByCharacterWithWords(k.getCharacter(), PageRequest.of(0, 8))
                .stream()
                .map(wk -> KanjiSearchResult.WordInfo.builder()
                        .word(wk.getWord().getWord())
                        .reading(wk.getWord().getReading())
                        .meaningText(primaryMeaningText(wk.getWord()))
                        .build())
                .toList();

        return KanjiSearchResult.builder()
                .character(k.getCharacter())
                .meaning(k.getMeaning())
                .onyomi(k.getOnyomi())
                .kunyomi(k.getKunyomi())
                .stroke(k.getStroke())
                .radical(k.getRadical())
                .jlptLevel(k.getJlptLevel())
                .words(relatedWords)
                .build();
    }

    /** Nghĩa hiển thị chính: ưu tiên tiếng Việt, ngược lại lấy nghĩa đầu tiên. */
    private static String primaryMeaningText(Word word) {
        List<Meaning> meanings = word.getMeanings();
        if (meanings == null || meanings.isEmpty()) {
            return null;
        }
        return meanings.stream()
                .filter(DictionaryServiceImpl::isVietnamese)
                .map(Meaning::getName)
                .findFirst()
                .orElse(meanings.get(0).getName());
    }

    private static boolean isVietnamese(Meaning m) {
        String code = m.getLanguage() != null ? m.getLanguage().getCode() : null;
        return code != null && ("vi".equalsIgnoreCase(code) || "vie".equalsIgnoreCase(code));
    }

    private WordSuggestion toSuggestion(Word word) {
        return WordSuggestion.builder()
                .id(word.getId())
                .word(word.getWord())
                .reading(word.getReading())
                .meaningText(primaryMeaningText(word))
                .levelCode(word.getLevel().getCode())
                .build();
    }

    @Override
    public WordSearchResult toWordResult(Word word) {
        List<WordSearchResult.KanjiInfo> kanjis = word.getWordKanjis() == null
                ? List.of()
                : word.getWordKanjis().stream()
                        .filter(wk -> Boolean.FALSE.equals(wk.getIsDeleted()))
                        .map(this::toKanjiInfo)
                        .toList();

        List<WordSearchResult.ExampleInfo> examples = word.getExamples() == null
                ? List.of()
                : word.getExamples().stream()
                        .filter(ex -> Boolean.FALSE.equals(ex.getIsDeleted()))
                        .map(this::toExampleInfo)
                        .toList();

        List<WordSearchResult.MeaningInfo> meanings = word.getMeanings() == null
                ? List.of()
                : word.getMeanings().stream()
                        .filter(m -> Boolean.FALSE.equals(m.getIsDeleted()))
                        .map(this::toMeaningInfo)
                        .toList();

        return WordSearchResult.builder()
                .id(word.getId())
                .word(word.getWord())
                .reading(word.getReading())
                .wordType(word.getWordType())
                .frequency(word.getFrequency())
                .representationCode(word.getRepresentation().getCode())
                .representationName(word.getRepresentation().getName())
                .meaningText(primaryMeaningText(word))
                .meanings(meanings)
                .levelCode(word.getLevel().getCode())
                .levelName(word.getLevel().getName())
                .kanjis(kanjis)
                .examples(examples)
                .build();
    }

    private WordSearchResult.MeaningInfo toMeaningInfo(Meaning m) {
        return WordSearchResult.MeaningInfo.builder()
                .name(m.getName())
                .languageCode(m.getLanguage() != null ? m.getLanguage().getCode() : null)
                .languageName(m.getLanguage() != null ? m.getLanguage().getName() : null)
                .build();
    }

    private WordSearchResult.KanjiInfo toKanjiInfo(WordKanji wk) {
        return WordSearchResult.KanjiInfo.builder()
                .character(wk.getCharacter())
                .onyomi(wk.getOnyomi())
                .kunyomi(wk.getKunyomi())
                .meaning(wk.getMeaning())
                .stroke(wk.getStroke())
                .radical(wk.getRadical())
                .build();
    }

    private WordSearchResult.ExampleInfo toExampleInfo(Example ex) {
        return WordSearchResult.ExampleInfo.builder()
                .rootExample(ex.getRootExample())
                .toExample(ex.getToExample())
                .rootLanguageName(ex.getRootLanguage() != null ? ex.getRootLanguage().getName() : null)
                .toLanguageName(ex.getToLanguage() != null ? ex.getToLanguage().getName() : null)
                .build();
    }
}