package com.example.starter_project_2025.domain.grammar.support;

import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Locates the surface span of a grammar point inside a Japanese sentence using the
 * sub-use's {@link GrammarMarker} patterns. Shared by the cloze builder (masking the
 * span) and the grammar detail screen (highlighting it, Bunpro-style).
 */
@Component
@RequiredArgsConstructor
public class GrammarSpanLocator {

    private final GrammarMarkerRepository markerRepository;

    /** Marker patterns of one sub-use with tilde/whitespace stripped (the "cores"). */
    public List<String> markerCores(Long subUseId) {
        return markerRepository.findBySubUseId(subUseId).stream()
                .map(GrammarMarker::getMarkerPattern)
                .map(GrammarSpanLocator::stripTilde)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /** Longest marker core that occurs (exactly, else as longest common substring) in the sentence. */
    public String locateSpan(String sentence, List<String> cores) {
        String best = "";
        for (String core : cores) {
            String found = sentence.contains(core) ? core : longestCommonSubstring(core, sentence);
            if (found.length() >= 2 && found.length() > best.length()) best = found;
        }
        return best;
    }

    public static String stripTilde(String s) {
        if (s == null) return "";
        return s.replace("～", "").replace("~", "").replaceAll("\\s", "").trim();
    }

    public static String longestCommonSubstring(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) return "";
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        int maxLen = 0, end = 0;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    if (dp[i][j] > maxLen) { maxLen = dp[i][j]; end = i; }
                }
            }
        }
        return a.substring(end - maxLen, end);
    }
}
