package com.example.starter_project_2025.system.analyze;

import java.util.HashMap;
import java.util.Map;

public final class JapaneseTextUtils {

    private JapaneseTextUtils() {
    }

    public static String katakanaToHiragana(String input) {
        if (input == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder(input.length());
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c >= 'ァ' && c <= 'ヶ') {
                sb.append((char) (c - 0x60));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    public static String orNull(String feature) {
        return (feature == null || "*".equals(feature)) ? null : feature;
    }

    public static boolean hasKanji(String s) {
        if (s == null) {
            return false;
        }
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= '一' && c <= '鿿') {
                return true;
            }
        }
        return false;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Kana → Hepburn romaji (used by RomajiService for the translate page).
    // Handles yōon (きゃ), sokuon (っ → doubled consonant), and the long-vowel
    // mark (ー). Non-kana characters are passed through unchanged.
    // ──────────────────────────────────────────────────────────────────────

    private static final Map<String, String> COMBO = new HashMap<>();
    private static final Map<Character, String> KANA = new HashMap<>();

    static {
        // yōon (palatalised) combinations
        put2("きゃ", "kya"); put2("きゅ", "kyu"); put2("きょ", "kyo");
        put2("ぎゃ", "gya"); put2("ぎゅ", "gyu"); put2("ぎょ", "gyo");
        put2("しゃ", "sha"); put2("しゅ", "shu"); put2("しょ", "sho");
        put2("じゃ", "ja");  put2("じゅ", "ju");  put2("じょ", "jo");
        put2("ちゃ", "cha"); put2("ちゅ", "chu"); put2("ちょ", "cho");
        put2("ぢゃ", "ja");  put2("ぢゅ", "ju");  put2("ぢょ", "jo");
        put2("にゃ", "nya"); put2("にゅ", "nyu"); put2("にょ", "nyo");
        put2("ひゃ", "hya"); put2("ひゅ", "hyu"); put2("ひょ", "hyo");
        put2("びゃ", "bya"); put2("びゅ", "byu"); put2("びょ", "byo");
        put2("ぴゃ", "pya"); put2("ぴゅ", "pyu"); put2("ぴょ", "pyo");
        put2("みゃ", "mya"); put2("みゅ", "myu"); put2("みょ", "myo");
        put2("りゃ", "rya"); put2("りゅ", "ryu"); put2("りょ", "ryo");
        // common foreign-sound combinations
        put2("ふぁ", "fa"); put2("ふぃ", "fi"); put2("ふぇ", "fe"); put2("ふぉ", "fo");
        put2("てぃ", "ti"); put2("でぃ", "di"); put2("とぅ", "tu"); put2("どぅ", "du");
        put2("うぃ", "wi"); put2("うぇ", "we"); put2("うぉ", "wo");
        put2("ゔぁ", "va"); put2("ゔぃ", "vi"); put2("ゔぇ", "ve"); put2("ゔぉ", "vo");
        put2("ちぇ", "che"); put2("しぇ", "she"); put2("じぇ", "je");

        // gojūon
        put1('あ', "a"); put1('い', "i"); put1('う', "u"); put1('え', "e"); put1('お', "o");
        put1('か', "ka"); put1('き', "ki"); put1('く', "ku"); put1('け', "ke"); put1('こ', "ko");
        put1('が', "ga"); put1('ぎ', "gi"); put1('ぐ', "gu"); put1('げ', "ge"); put1('ご', "go");
        put1('さ', "sa"); put1('し', "shi"); put1('す', "su"); put1('せ', "se"); put1('そ', "so");
        put1('ざ', "za"); put1('じ', "ji"); put1('ず', "zu"); put1('ぜ', "ze"); put1('ぞ', "zo");
        put1('た', "ta"); put1('ち', "chi"); put1('つ', "tsu"); put1('て', "te"); put1('と', "to");
        put1('だ', "da"); put1('ぢ', "ji"); put1('づ', "zu"); put1('で', "de"); put1('ど', "do");
        put1('な', "na"); put1('に', "ni"); put1('ぬ', "nu"); put1('ね', "ne"); put1('の', "no");
        put1('は', "ha"); put1('ひ', "hi"); put1('ふ', "fu"); put1('へ', "he"); put1('ほ', "ho");
        put1('ば', "ba"); put1('び', "bi"); put1('ぶ', "bu"); put1('べ', "be"); put1('ぼ', "bo");
        put1('ぱ', "pa"); put1('ぴ', "pi"); put1('ぷ', "pu"); put1('ぺ', "pe"); put1('ぽ', "po");
        put1('ま', "ma"); put1('み', "mi"); put1('む', "mu"); put1('め', "me"); put1('も', "mo");
        put1('や', "ya"); put1('ゆ', "yu"); put1('よ', "yo");
        put1('ら', "ra"); put1('り', "ri"); put1('る', "ru"); put1('れ', "re"); put1('ろ', "ro");
        put1('わ', "wa"); put1('を', "wo"); put1('ん', "n"); put1('ゔ', "vu");
        // small kana (when not part of a combo)
        put1('ぁ', "a"); put1('ぃ', "i"); put1('ぅ', "u"); put1('ぇ', "e"); put1('ぉ', "o");
        put1('ゃ', "ya"); put1('ゅ', "yu"); put1('ょ', "yo"); put1('ゎ', "wa");
    }

    private static void put2(String kana, String romaji) {
        COMBO.put(kana, romaji);
    }

    private static void put1(char kana, String romaji) {
        KANA.put(kana, romaji);
    }

    /** Convert a kana string (hiragana or katakana) to Hepburn romaji. */
    public static String kanaToRomaji(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }
        String s = katakanaToHiragana(input);
        StringBuilder sb = new StringBuilder(s.length() * 2);
        boolean sokuon = false;
        int i = 0;
        while (i < s.length()) {
            // yōon / foreign combo (2 chars)
            if (i + 1 < s.length()) {
                String two = s.substring(i, i + 2);
                String combo = COMBO.get(two);
                if (combo != null) {
                    sb.append(applySokuon(sokuon, combo));
                    sokuon = false;
                    i += 2;
                    continue;
                }
            }
            char c = s.charAt(i);
            if (c == 'っ') {                 // sokuon: double the next consonant
                sokuon = true;
                i++;
                continue;
            }
            if (c == 'ー') {                 // long-vowel mark: repeat last vowel
                char v = lastVowel(sb);
                if (v != 0) {
                    sb.append(v);
                }
                i++;
                continue;
            }
            String romaji = KANA.get(c);
            if (romaji == null) {
                sb.append(c);                // pass through (kanji left over, punctuation, latin)
            } else {
                sb.append(applySokuon(sokuon, romaji));
            }
            sokuon = false;
            i++;
        }
        return sb.toString();
    }

    private static String applySokuon(boolean sokuon, String romaji) {
        if (!sokuon || romaji.isEmpty()) {
            return romaji;
        }
        // っち→ tchi, っちゃ→ tcha (Hepburn); otherwise double the leading consonant
        if (romaji.startsWith("ch")) {
            return "t" + romaji;
        }
        char first = romaji.charAt(0);
        if (Character.isLetter(first) && "aiueo".indexOf(first) < 0) {
            return first + romaji;
        }
        return romaji;
    }

    private static char lastVowel(StringBuilder sb) {
        for (int i = sb.length() - 1; i >= 0; i--) {
            char c = sb.charAt(i);
            if ("aiueo".indexOf(c) >= 0) {
                return c;
            }
            if (Character.isLetter(c)) {
                return 0;          // hit a consonant first — no vowel to lengthen
            }
        }
        return 0;
    }
}
