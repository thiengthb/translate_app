package com.example.starter_project_2025.system.analyze;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyzeService {

    private final SudachiTokenizer tokenizer;

    private static final Map<String, String> POS_VI = Map.ofEntries(
            Map.entry("名詞", "danh từ"),
            Map.entry("動詞", "động từ"),
            Map.entry("形容詞", "tính từ"),
            Map.entry("形容動詞", "tính từ (na)"),
            Map.entry("副詞", "phó từ"),
            Map.entry("助詞", "trợ từ"),
            Map.entry("助動詞", "trợ động từ"),
            Map.entry("連体詞", "định từ"),
            Map.entry("接続詞", "liên từ"),
            Map.entry("感動詞", "thán từ"),
            Map.entry("接頭詞", "tiền tố"),
            Map.entry("接尾", "hậu tố"),
            Map.entry("記号", "ký hiệu"),
            Map.entry("フィラー", "từ đệm"),
            Map.entry("その他", "khác")
    );

    public AnalysisResponse analyze(String text) {
        String trimmed = text == null ? "" : text.trim();

        if (trimmed.isEmpty()) {
            return AnalysisResponse.builder()
                    .originalText("")
                    .tokenCount(0)
                    .tokens(Collections.emptyList())
                    .build();
        }

        List<TokenDTO> tokens = tokenizer.tokenize(trimmed).stream()
                .map(this::toDto)
                .toList();

        return AnalysisResponse.builder()
                .originalText(trimmed)
                .tokenCount(tokens.size())
                .tokens(tokens)
                .build();
    }

    private TokenDTO toDto(SudachiToken token) {
        String surface = token.getSurface();
        String reading = JapaneseTextUtils.orNull(token.getReading());
        String hiraganaReading = JapaneseTextUtils.katakanaToHiragana(reading);
        String pos = token.getPartOfSpeechLevel1();

        return TokenDTO.builder()
                .surface(surface)
                .reading(hiraganaReading)
                .furigana(JapaneseTextUtils.hasKanji(surface) ? hiraganaReading : null)
                .partOfSpeech(pos)
                .partOfSpeechVi(POS_VI.getOrDefault(pos, pos))
                .baseForm(JapaneseTextUtils.orNull(token.getBaseForm()))
                .build();
    }
}
