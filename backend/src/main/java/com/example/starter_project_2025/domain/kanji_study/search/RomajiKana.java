package com.example.starter_project_2025.domain.kanji_study.search;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Small, dependency-free text helpers for kanji/vocabulary search:
 *
 * <ul>
 *   <li>{@link #toHiragana(String)} — best-effort wāpuro romaji → hiragana
 *       ("jigoku" → じごく) so users can type readings on a Latin keyboard;</li>
 *   <li>{@link #kataToHira(String)} — fold katakana to hiragana so on-yomi
 *       (stored カタカナ) compares equal to a hiragana query;</li>
 *   <li>{@link #stripDiacritics(String)} — fold Vietnamese tones ("địa" → "dia")
 *       for diacritic-insensitive Hán-Việt matching;</li>
 *   <li>{@link #isRomaji(String)} — is this query plain Latin (worth converting)?</li>
 * </ul>
 */
public final class RomajiKana {

    private RomajiKana() {}

    private static final Set<Character> VOWELS = Set.of('a', 'i', 'u', 'e', 'o');

    private static final Map<String, String> MAP = new HashMap<>();

    static {
        String[][] pairs = {
            {"a", "あ"}, {"i", "い"}, {"u", "う"}, {"e", "え"}, {"o", "お"},
            {"ka", "か"}, {"ki", "き"}, {"ku", "く"}, {"ke", "け"}, {"ko", "こ"},
            {"ga", "が"}, {"gi", "ぎ"}, {"gu", "ぐ"}, {"ge", "げ"}, {"go", "ご"},
            {"sa", "さ"}, {"shi", "し"}, {"si", "し"}, {"su", "す"}, {"se", "せ"}, {"so", "そ"},
            {"za", "ざ"}, {"ji", "じ"}, {"zi", "じ"}, {"zu", "ず"}, {"ze", "ぜ"}, {"zo", "ぞ"},
            {"ta", "た"}, {"chi", "ち"}, {"ti", "ち"}, {"tsu", "つ"}, {"tu", "つ"}, {"te", "て"}, {"to", "と"},
            {"da", "だ"}, {"di", "ぢ"}, {"du", "づ"}, {"de", "で"}, {"do", "ど"},
            {"na", "な"}, {"ni", "に"}, {"nu", "ぬ"}, {"ne", "ね"}, {"no", "の"},
            {"ha", "は"}, {"hi", "ひ"}, {"fu", "ふ"}, {"hu", "ふ"}, {"he", "へ"}, {"ho", "ほ"},
            {"ba", "ば"}, {"bi", "び"}, {"bu", "ぶ"}, {"be", "べ"}, {"bo", "ぼ"},
            {"pa", "ぱ"}, {"pi", "ぴ"}, {"pu", "ぷ"}, {"pe", "ぺ"}, {"po", "ぽ"},
            {"ma", "ま"}, {"mi", "み"}, {"mu", "む"}, {"me", "め"}, {"mo", "も"},
            {"ya", "や"}, {"yu", "ゆ"}, {"yo", "よ"},
            {"ra", "ら"}, {"ri", "り"}, {"ru", "る"}, {"re", "れ"}, {"ro", "ろ"},
            {"wa", "わ"}, {"wo", "を"}, {"wi", "ゐ"}, {"we", "ゑ"},
            {"vu", "ゔ"},
            // youon (palatalised)
            {"kya", "きゃ"}, {"kyu", "きゅ"}, {"kyo", "きょ"},
            {"gya", "ぎゃ"}, {"gyu", "ぎゅ"}, {"gyo", "ぎょ"},
            {"sha", "しゃ"}, {"shu", "しゅ"}, {"sho", "しょ"},
            {"sya", "しゃ"}, {"syu", "しゅ"}, {"syo", "しょ"},
            {"ja", "じゃ"}, {"ju", "じゅ"}, {"jo", "じょ"},
            {"jya", "じゃ"}, {"jyu", "じゅ"}, {"jyo", "じょ"},
            {"cha", "ちゃ"}, {"chu", "ちゅ"}, {"cho", "ちょ"},
            {"cya", "ちゃ"}, {"tya", "ちゃ"}, {"tyu", "ちゅ"}, {"tyo", "ちょ"},
            {"nya", "にゃ"}, {"nyu", "にゅ"}, {"nyo", "にょ"},
            {"hya", "ひゃ"}, {"hyu", "ひゅ"}, {"hyo", "ひょ"},
            {"bya", "びゃ"}, {"byu", "びゅ"}, {"byo", "びょ"},
            {"pya", "ぴゃ"}, {"pyu", "ぴゅ"}, {"pyo", "ぴょ"},
            {"mya", "みゃ"}, {"myu", "みゅ"}, {"myo", "みょ"},
            {"rya", "りゃ"}, {"ryu", "りゅ"}, {"ryo", "りょ"},
            {"-", "ー"},
        };
        for (String[] p : pairs) MAP.put(p[0], p[1]);
    }

    /** Best-effort wāpuro romaji → hiragana. Unknown characters pass through. */
    public static String toHiragana(String input) {
        if (input == null || input.isEmpty()) return "";
        String s = input.toLowerCase().trim();
        StringBuilder out = new StringBuilder(s.length());
        int i = 0;
        int n = s.length();
        while (i < n) {
            char c = s.charAt(i);
            char next = i + 1 < n ? s.charAt(i + 1) : '\0';

            // Sokuon (っ): doubled consonant, or "tch" → っ + ち…
            if (Character.isLetter(c) && !VOWELS.contains(c) && c != 'n'
                    && (c == next || (c == 't' && next == 'c'))) {
                out.append('っ');
                i++;
                continue;
            }

            // Standalone ん: 'n' not forming な/に/.../にゃ.
            if (c == 'n' && !(VOWELS.contains(next) || next == 'y')) {
                out.append('ん');
                i += (next == 'n') ? 2 : 1; // "nn" → ん
                continue;
            }

            boolean matched = false;
            for (int len = Math.min(3, n - i); len >= 1; len--) {
                String kana = MAP.get(s.substring(i, i + len));
                if (kana != null) {
                    out.append(kana);
                    i += len;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                out.append(c);
                i++;
            }
        }
        return out.toString();
    }

    /** Fold katakana to hiragana so カタカナ readings compare equal to hiragana. */
    public static String kataToHira(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            if (c >= 0x30A1 && c <= 0x30F6) sb.append((char) (c - 0x60));
            else sb.append(c);
        }
        return sb.toString();
    }

    /** Remove combining diacritics ("địa" → "dia"); also folds đ → d. */
    public static String stripDiacritics(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return n.replace('đ', 'd').replace('Đ', 'D');
    }

    /** True when the query is plain Latin letters (a romaji candidate). */
    public static boolean isRomaji(String s) {
        if (s == null || s.isBlank()) return false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            boolean ok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
                    || c == '-' || c == ' ' || c == '\'';
            if (!ok) return false;
        }
        return true;
    }

    /** True when the string contains any hiragana/katakana character. */
    public static boolean hasKana(String s) {
        if (s == null) return false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if ((c >= 0x3040 && c <= 0x309F) || (c >= 0x30A0 && c <= 0x30FF)) return true;
        }
        return false;
    }
}
