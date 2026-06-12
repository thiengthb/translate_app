package com.example.starter_project_2025.system.analyze;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One ruby segment of a Japanese sentence: a run of text plus its optional
 * furigana reading. Kana-only / punctuation runs carry {@code ruby == null};
 * kanji runs carry the hiragana reading aligned to just the kanji span
 * (okurigana is split into a separate plain segment).
 *
 * <p>Stored as a JSON array on {@code kanji_sentences.segments_json} and sent to
 * the frontend so it can render {@code <ruby>} and, later, blank out the segment
 * containing a target kanji for fill-in-the-blank questions.</p>
 *
 * <p>JSON keys are intentionally short ({@code t}/{@code r}) — a corpus has many
 * thousands of sentences and the segment arrays are stored verbatim.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FuriganaSegment(String t, String r) {

    /** A run with no reading (kana, punctuation, latin, numbers). */
    public static FuriganaSegment plain(String text) {
        return new FuriganaSegment(text, null);
    }

    /** A kanji run with its hiragana reading. */
    public static FuriganaSegment ruby(String text, String reading) {
        return new FuriganaSegment(text, reading);
    }
}
