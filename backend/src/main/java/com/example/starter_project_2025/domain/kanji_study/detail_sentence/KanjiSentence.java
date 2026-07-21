package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * An example sentence owned by Kanji Study, used by the per-kanji "Câu" section
 * and (later) fill-in-the-blank questions. Self-contained — sentences are linked
 * to {@code kanji_details} via {@link KanjiSentenceLink}, never to the shared
 * dictionary {@code words}/{@code examples} tables.
 *
 * <p>{@code segmentsJson} holds the Sudachi-generated furigana as a JSON array of
 * {@link com.example.starter_project_2025.system.analyze.FuriganaSegment} so the
 * frontend can render ruby and blank out a target kanji span.</p>
 *
 * <p>{@code tatoebaId} is the upstream sentence id, kept unique so re-importing
 * the seed is idempotent.</p>
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "kanji_sentences",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_kanji_sentence_tatoeba", columnNames = "tatoeba_id")
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiSentence extends BaseEntity {

    @Column(name = "japanese", nullable = false, columnDefinition = "TEXT")
    String japanese;

    /** Furigana segments as JSON ([{"t":"三","r":"みっ"},{"t":"つ"}, ...]). */
    @Column(name = "segments_json", columnDefinition = "LONGTEXT")
    String segmentsJson;

    @Column(name = "translation_en", columnDefinition = "TEXT")
    String translationEn;

    @Column(name = "translation_vi", columnDefinition = "TEXT")
    String translationVi;

    @Column(name = "source", length = 32)
    String source;

    @Column(name = "tatoeba_id")
    Long tatoebaId;

    /** Character count of the Japanese sentence — drives short-first ordering. */
    @Column(name = "length_chars")
    Integer lengthChars;
}
