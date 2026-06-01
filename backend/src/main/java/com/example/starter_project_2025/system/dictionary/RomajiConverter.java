package com.example.starter_project_2025.system.dictionary;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RomajiConverter {

    private static final List<Map.Entry<String, String>> PATTERNS;

    static {
        // LinkedHashMap preserves insertion order; we sort by key length descending after
        Map<String, String> map = new LinkedHashMap<>();

        // 4-char combos
        map.put("tchi", "っち"); map.put("cchi", "っち");

        // 3-char combos (compound kana)
        map.put("sha", "しゃ"); map.put("shi", "し"); map.put("shu", "しゅ"); map.put("she", "しぇ"); map.put("sho", "しょ");
        map.put("chi", "ち");   map.put("cha", "ちゃ"); map.put("chu", "ちゅ"); map.put("che", "ちぇ"); map.put("cho", "ちょ");
        map.put("tsu", "つ");
        map.put("kya", "きゃ"); map.put("kyi", "きぃ"); map.put("kyu", "きゅ"); map.put("kye", "きぇ"); map.put("kyo", "きょ");
        map.put("nya", "にゃ"); map.put("nyi", "にぃ"); map.put("nyu", "にゅ"); map.put("nye", "にぇ"); map.put("nyo", "にょ");
        map.put("hya", "ひゃ"); map.put("hyi", "ひぃ"); map.put("hyu", "ひゅ"); map.put("hye", "ひぇ"); map.put("hyo", "ひょ");
        map.put("mya", "みゃ"); map.put("myi", "みぃ"); map.put("myu", "みゅ"); map.put("mye", "みぇ"); map.put("myo", "みょ");
        map.put("rya", "りゃ"); map.put("ryi", "りぃ"); map.put("ryu", "りゅ"); map.put("rye", "りぇ"); map.put("ryo", "りょ");
        map.put("gya", "ぎゃ"); map.put("gyi", "ぎぃ"); map.put("gyu", "ぎゅ"); map.put("gye", "ぎぇ"); map.put("gyo", "ぎょ");
        map.put("bya", "びゃ"); map.put("byi", "びぃ"); map.put("byu", "びゅ"); map.put("bye", "びぇ"); map.put("byo", "びょ");
        map.put("pya", "ぴゃ"); map.put("pyi", "ぴぃ"); map.put("pyu", "ぴゅ"); map.put("pye", "ぴぇ"); map.put("pyo", "ぴょ");
        map.put("dya", "ぢゃ"); map.put("dyu", "ぢゅ"); map.put("dyo", "ぢょ");
        map.put("zya", "じゃ"); map.put("zyu", "じゅ"); map.put("zyo", "じょ");
        map.put("jya", "じゃ"); map.put("jyu", "じゅ"); map.put("jyo", "じょ");
        map.put("ja",  "じゃ"); map.put("ju",  "じゅ"); map.put("jo",  "じょ");

        // 2-char combos
        map.put("ka", "か"); map.put("ki", "き"); map.put("ku", "く"); map.put("ke", "け"); map.put("ko", "こ");
        map.put("sa", "さ"); map.put("si", "し"); map.put("su", "す"); map.put("se", "せ"); map.put("so", "そ");
        map.put("ta", "た"); map.put("ti", "ち"); map.put("tu", "つ"); map.put("te", "て"); map.put("to", "と");
        map.put("na", "な"); map.put("ni", "に"); map.put("nu", "ぬ"); map.put("ne", "ね"); map.put("no", "の");
        map.put("ha", "は"); map.put("hi", "ひ"); map.put("fu", "ふ"); map.put("hu", "ふ"); map.put("he", "へ"); map.put("ho", "ほ");
        map.put("ma", "ま"); map.put("mi", "み"); map.put("mu", "む"); map.put("me", "め"); map.put("mo", "も");
        map.put("ya", "や"); map.put("yu", "ゆ"); map.put("yo", "よ");
        map.put("ra", "ら"); map.put("ri", "り"); map.put("ru", "る"); map.put("re", "れ"); map.put("ro", "ろ");
        map.put("wa", "わ"); map.put("wi", "ゐ"); map.put("we", "ゑ"); map.put("wo", "を");
        map.put("ga", "が"); map.put("gi", "ぎ"); map.put("gu", "ぐ"); map.put("ge", "げ"); map.put("go", "ご");
        map.put("za", "ざ"); map.put("zi", "じ"); map.put("zu", "ず"); map.put("ze", "ぜ"); map.put("zo", "ぞ");
        map.put("ji", "じ");
        map.put("da", "だ"); map.put("di", "ぢ"); map.put("du", "づ"); map.put("de", "で"); map.put("do", "ど");
        map.put("ba", "ば"); map.put("bi", "び"); map.put("bu", "ぶ"); map.put("be", "べ"); map.put("bo", "ぼ");
        map.put("pa", "ぱ"); map.put("pi", "ぴ"); map.put("pu", "ぷ"); map.put("pe", "ぺ"); map.put("po", "ぽ");

        // 1-char vowels
        map.put("a", "あ"); map.put("i", "い"); map.put("u", "う"); map.put("e", "え"); map.put("o", "お");
        map.put("n", "ん");

        // Sort by key length descending for greedy matching
        PATTERNS = new ArrayList<>(map.entrySet());
        PATTERNS.sort((e1, e2) -> e2.getKey().length() - e1.getKey().length());
    }

    private static final String VOWELS = "aeiou";

    /** Convert Hepburn romaji string to hiragana. Non-romaji characters pass through unchanged. */
    public static String toHiragana(String romaji) {
        if (romaji == null || romaji.isBlank()) return romaji;
        String lower = romaji.toLowerCase().replace("-", "").replace("'", "").replace("ā", "aa")
                .replace("ū", "uu").replace("ō", "oo").replace("ē", "ee").replace("ī", "ii");
        StringBuilder result = new StringBuilder();
        int i = 0;
        while (i < lower.length()) {
            char cur = lower.charAt(i);
            char next = i + 1 < lower.length() ? lower.charAt(i + 1) : 0;

            // Double consonant → っ (but not "nn")
            if (cur == next && cur != 'n' && VOWELS.indexOf(cur) == -1) {
                result.append("っ");
                i++;
                continue;
            }

            // "nn" or "n" before consonant/end → ん
            if (cur == 'n') {
                if (next == 'n') {
                    result.append("ん");
                    i += 2;
                    continue;
                }
                // n before a consonant (not y) or at end
                if (next == 0 || (VOWELS.indexOf(next) == -1 && next != 'y')) {
                    result.append("ん");
                    i++;
                    continue;
                }
            }

            // Greedy pattern match
            boolean matched = false;
            for (Map.Entry<String, String> entry : PATTERNS) {
                String key = entry.getKey();
                if (lower.startsWith(key, i)) {
                    result.append(entry.getValue());
                    i += key.length();
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                result.append(cur);
                i++;
            }
        }
        return result.toString();
    }

    /** Returns true if the string contains only ASCII letters (likely romaji). */
    public static boolean isRomaji(String input) {
        if (input == null || input.isBlank()) return false;
        return input.chars().allMatch(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '-' || c == '\'');
    }
}