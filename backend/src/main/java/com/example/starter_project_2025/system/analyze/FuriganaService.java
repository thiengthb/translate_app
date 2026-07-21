package com.example.starter_project_2025.system.analyze;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Converts Japanese text into ruby (furigana) segments using {@link SudachiTokenizer}.
 *
 * <p>Two output shapes are supported:</p>
 * <ul>
 *   <li>{@link #annotate(String)} → {@link RubySegment} list (used by the Grammar
 *       dashboard's furigana endpoint).</li>
 *   <li>{@link #segment(String)} → {@link FuriganaSegment} list (used by the
 *       Kanji-Study sentence features).</li>
 * </ul>
 *
 * <p>In both cases readings attach only to the kanji core of a token — okurigana
 * and shared prefix kana (e.g. お/ご) are peeled off into plain segments so the
 * ruby sits over kanji only, like Bunpro / jisho.org. Segment texts concatenate
 * back to the exact input.</p>
 */
@Service
@RequiredArgsConstructor
public class FuriganaService {

    private final SudachiTokenizer tokenizer;

    /** One run of text; {@code ruby} is the hiragana reading or null for kana/latin runs. */
    public record RubySegment(String text, String ruby) {}

    // ── RubySegment API (Grammar dashboard) ──────────────────────────────

    public List<RubySegment> annotate(String text) {
        List<RubySegment> out = new ArrayList<>();
        if (text == null || text.isBlank()) return out;

        for (SudachiToken t : tokenizer.tokenize(text)) {
            String surface = t.getSurface();
            String katakana = t.getReading();
            if (!containsKanji(surface) || katakana == null || katakana.isBlank() || "*".equals(katakana)) {
                appendRuby(out, surface, null);
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

            if (p > 0) appendRuby(out, surface.substring(0, p), null);
            String core = surface.substring(p, sEnd);
            String coreReading = reading.substring(p, rEnd);
            appendRuby(out, core, coreReading.isBlank() ? null : coreReading);
            if (sEnd < surface.length()) appendRuby(out, surface.substring(sEnd), null);
        }
        return out;
    }

    /** Append, merging consecutive no-ruby runs so the segment list stays small. */
    private static void appendRuby(List<RubySegment> out, String text, String ruby) {
        if (text.isEmpty()) return;
        if (ruby == null && !out.isEmpty() && out.get(out.size() - 1).ruby() == null) {
            RubySegment last = out.remove(out.size() - 1);
            out.add(new RubySegment(last.text() + text, null));
        } else {
            out.add(new RubySegment(text, ruby));
        }
    }

    // ── FuriganaSegment API (Kanji-Study sentences) ──────────────────────

    public List<FuriganaSegment> segment(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        List<FuriganaSegment> out = new ArrayList<>();
        for (SudachiToken token : tokenizer.tokenize(text)) {
            String surface = token.getSurface();
            if (surface == null || surface.isEmpty()) {
                continue;
            }
            if (!JapaneseTextUtils.hasKanji(surface)) {
                append(out, FuriganaSegment.plain(surface));
                continue;
            }
            String reading = JapaneseTextUtils.katakanaToHiragana(
                    JapaneseTextUtils.orNull(token.getReading()));
            if (reading == null || reading.isBlank()) {
                append(out, FuriganaSegment.plain(surface));
                continue;
            }
            alignToken(surface, reading, out);
        }
        return out;
    }

    /** Peel shared prefix/suffix kana, then assign the remaining reading to the kanji core. */
    private void alignToken(String surface, String reading, List<FuriganaSegment> out) {
        int sStart = 0, sEnd = surface.length();
        int rStart = 0, rEnd = reading.length();

        // Leading kana shared by surface and reading (e.g. お茶 → peel お).
        while (sStart < sEnd && rStart < rEnd
                && isKana(surface.charAt(sStart))
                && surface.charAt(sStart) == reading.charAt(rStart)) {
            sStart++;
            rStart++;
        }
        // Trailing kana shared by surface and reading (okurigana, e.g. 貸して → peel して).
        while (sEnd > sStart && rEnd > rStart
                && isKana(surface.charAt(sEnd - 1))
                && surface.charAt(sEnd - 1) == reading.charAt(rEnd - 1)) {
            sEnd--;
            rEnd--;
        }

        String prefix = surface.substring(0, sStart);
        String core = surface.substring(sStart, sEnd);
        String suffix = surface.substring(sEnd);
        String coreReading = reading.substring(rStart, rEnd);

        if (!prefix.isEmpty()) {
            append(out, FuriganaSegment.plain(prefix));
        }
        if (!core.isEmpty()) {
            if (JapaneseTextUtils.hasKanji(core) && !coreReading.isEmpty()) {
                append(out, FuriganaSegment.ruby(core, coreReading));
            } else {
                // Core has no kanji (or reading collapsed away) — keep it readable, no ruby.
                append(out, FuriganaSegment.plain(core));
            }
        }
        if (!suffix.isEmpty()) {
            append(out, FuriganaSegment.plain(suffix));
        }
    }

    /** Append, merging consecutive plain (ruby-less) runs so kana/punctuation coalesce. */
    private static void append(List<FuriganaSegment> out, FuriganaSegment seg) {
        if (seg.t() == null || seg.t().isEmpty()) {
            return;
        }
        if (seg.r() == null && !out.isEmpty()) {
            FuriganaSegment last = out.get(out.size() - 1);
            if (last.r() == null) {
                out.set(out.size() - 1, FuriganaSegment.plain(last.t() + seg.t()));
                return;
            }
        }
        out.add(seg);
    }

    // ── shared kana helpers ──────────────────────────────────────────────

    private static boolean containsKanji(String s) {
        return s.codePoints().anyMatch(cp ->
                (cp >= 0x4E00 && cp <= 0x9FFF) || cp == '々' || cp == '〆');
    }

    /** Hiragana, katakana, or the prolonged-sound / iteration marks. */
    private static boolean isKana(char c) {
        return (c >= 0x3041 && c <= 0x3096)   // hiragana
                || (c >= 0x30A1 && c <= 0x30FA) // katakana
                || c == 0x30FC                  // ー prolonged sound mark
                || c == 0x30FD || c == 0x30FE;  // katakana iteration marks
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
