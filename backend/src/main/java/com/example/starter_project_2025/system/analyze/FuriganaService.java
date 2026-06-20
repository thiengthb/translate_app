package com.example.starter_project_2025.system.analyze;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Converts Japanese text into ruby (furigana) segments using {@link SudachiTokenizer}.
 *
 * <p>Each segment is a run of text with an optional hiragana reading. Readings are
 * attached only to the kanji core of a token — okurigana (kana already visible in
 * the surface, e.g. the べ of 食べ) is split off so the ruby sits over kanji only,
 * like Bunpro / jisho.org. Segment texts concatenate back to the exact input.</p>
 */
@Service
@RequiredArgsConstructor
public class FuriganaService {

    private final SudachiTokenizer tokenizer;

    /** One run of text; {@code ruby} is the hiragana reading or null for kana/latin runs. */
    public record RubySegment(String text, String ruby) {}

    public List<RubySegment> annotate(String text) {
        List<RubySegment> out = new ArrayList<>();
        if (text == null || text.isBlank()) return out;

        for (SudachiToken t : tokenizer.tokenize(text)) {
            String surface = t.getSurface();
            String katakana = t.getReading();
            if (!containsKanji(surface) || katakana == null || katakana.isBlank() || "*".equals(katakana)) {
                append(out, surface, null);
                continue;
            }
            String reading = kataToHira(katakana);

            // Trim kana shared with the surface off both ends so ruby covers kanji only.
            String hiraSurface = kataToHira(surface);
            int p = 0;
            while (p < surface.length() && p < reading.length()
                    && isKana(surface.charAt(p))
                    && hiraSurface.charAt(p) == reading.charAt(p)) {
                p++;
            }
            int sEnd = surface.length(), rEnd = reading.length();
            while (sEnd > p && rEnd > p
                    && isKana(surface.charAt(sEnd - 1))
                    && hiraSurface.charAt(sEnd - 1) == reading.charAt(rEnd - 1)) {
                sEnd--;
                rEnd--;
            }

            if (p > 0) append(out, surface.substring(0, p), null);
            String core = surface.substring(p, sEnd);
            String coreReading = reading.substring(p, rEnd);
            append(out, core, coreReading.isBlank() ? null : coreReading);
            if (sEnd < surface.length()) append(out, surface.substring(sEnd), null);
        }
        return out;
    }

    /** Append, merging consecutive no-ruby runs so the segment list stays small. */
    private static void append(List<RubySegment> out, String text, String ruby) {
        if (text.isEmpty()) return;
        if (ruby == null && !out.isEmpty() && out.get(out.size() - 1).ruby() == null) {
            RubySegment last = out.remove(out.size() - 1);
            out.add(new RubySegment(last.text() + text, null));
        } else {
            out.add(new RubySegment(text, ruby));
        }
    }

    private static boolean containsKanji(String s) {
        return s.codePoints().anyMatch(cp ->
                (cp >= 0x4E00 && cp <= 0x9FFF) || cp == '々' || cp == '〆');
    }

    private static boolean isKana(char c) {
        return (c >= 0x3041 && c <= 0x3096)   // hiragana
                || (c >= 0x30A1 && c <= 0x30FA) // katakana
                || c == 'ー';
    }

    /** Katakana → hiragana (other chars unchanged). */
    private static String kataToHira(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            sb.append(c >= 0x30A1 && c <= 0x30F6 ? (char) (c - 0x60) : c);
        }
        return sb.toString();
    }
}
