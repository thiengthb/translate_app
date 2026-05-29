package com.example.starter_project_2025.domain.production.detector;

import com.atilika.kuromoji.ipadic.Token;

import java.util.List;

public final class DetectorSupport {

    private DetectorSupport() {}

    public static String joinSurfaces(List<Token> tokens) {
        StringBuilder sb = new StringBuilder();
        for (Token t : tokens) {
            sb.append(t.getSurface());
        }
        return sb.toString();
    }

    public static boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n)) return true;
        }
        return false;
    }
}
