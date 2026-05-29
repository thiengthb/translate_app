package com.example.starter_project_2025.system.analyze;

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
}
