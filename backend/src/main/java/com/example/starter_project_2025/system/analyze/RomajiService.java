package com.example.starter_project_2025.system.analyze;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Converts Japanese text into word-spaced Hepburn romaji (Google-Translate
 * style, e.g. {@code "Watashi wa kare ni jogen suru..."}).
 *
 * Uses the shared {@link SudachiTokenizer} bean to get per-word readings, then
 * {@link JapaneseTextUtils#kanaToRomaji(String)} to romanise each reading. Word
 * boundaries from the tokenizer become spaces; punctuation hugs the previous word.
 */
@Service
@RequiredArgsConstructor
public class RomajiService {

    private final SudachiTokenizer tokenizer;

    private static final Map<String, String> PUNCT = Map.of(
            "、", ",", "。", ".", "，", ",", "．", ".",
            "！", "!", "？", "?", "・", " ", "　", " ");

    /** Romanise a full sentence; returns {@code ""} for null/blank input. */
    public String toRomaji(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        boolean first = true;

        for (SudachiToken token : tokenizer.tokenize(text)) {
            String surface = token.getSurface();
            String pos = token.getPartOfSpeechLevel1();
            boolean punctuation = "記号".equals(pos);

            String piece = punctuation ? mapPunct(surface) : wordRomaji(token, surface, pos);
            if (piece == null || piece.isEmpty()) {
                continue;
            }

            if (first) {
                sb.append(piece);
                first = false;
            } else if (punctuation) {
                sb.append(piece);          // hug the previous word: "kitaga,"
            } else {
                sb.append(' ').append(piece);
            }
        }

        return capitalize(sb.toString().trim().replaceAll(" +", " "));
    }

    private String wordRomaji(SudachiToken token, String surface, String pos) {
        // The three classic particle readings MeCab spells phonetically.
        if ("助詞".equals(pos)) {
            switch (surface) {
                case "は": return "wa";
                case "へ": return "e";
                case "を": return "o";
                default: break;
            }
        }
        String reading = token.getReading();
        String kana = (reading == null || "*".equals(reading)) ? surface : reading;
        return JapaneseTextUtils.kanaToRomaji(kana);
    }

    private String mapPunct(String surface) {
        String mapped = PUNCT.get(surface);
        return mapped != null ? mapped : surface;
    }

    private String capitalize(String s) {
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isLetter(c)) {
                return s.substring(0, i) + Character.toUpperCase(c) + s.substring(i + 1);
            }
        }
        return s;
    }
}
