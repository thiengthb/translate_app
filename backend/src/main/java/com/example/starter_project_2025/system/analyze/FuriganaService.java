package com.example.starter_project_2025.system.analyze;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns a Japanese sentence into a list of {@link FuriganaSegment}s (ruby data)
 * using {@link SudachiTokenizer}.
 *
 * <p>For each morpheme the surface is paired with its hiragana reading, then the
 * reading is <em>aligned</em> to the kanji span: leading/trailing kana shared by
 * surface and reading (okurigana, prefixes like お/ご) are peeled off into plain
 * segments so the ruby sits over just the kanji — e.g. 「貸して」 → 「貸」(か) +
 * 「して」, matching how the reference app renders it.</p>
 *
 * <p>Interleaved kanji-kana-kanji tokens (rare) fall back to a single ruby over
 * the whole remaining core; the reading is never wrong for the sentence as a
 * whole, only occasionally spanning a little wider than ideal.</p>
 */
@Service
@RequiredArgsConstructor
public class FuriganaService {

    private final SudachiTokenizer tokenizer;

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

    /** Hiragana, katakana, or the prolonged-sound / iteration marks. */
    private static boolean isKana(char c) {
        return (c >= 0x3041 && c <= 0x3096)   // hiragana
                || (c >= 0x30A1 && c <= 0x30FA) // katakana
                || c == 0x30FC                  // ー prolonged sound mark
                || c == 0x30FD || c == 0x30FE;  // katakana iteration marks
    }
}
