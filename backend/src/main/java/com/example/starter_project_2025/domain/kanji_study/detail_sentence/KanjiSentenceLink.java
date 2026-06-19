package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Join between a Kanji-Study kanji ({@link KanjiDetail}) and a {@link KanjiSentence}
 * that contains it — the sentence equivalent of
 * {@link com.example.starter_project_2025.domain.kanji_study.detail_word.KanjiDetailWord}.
 *
 * <p>{@code character} is denormalized so the read path can page sentences by
 * character without joining {@code kanji_details}.</p>
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "kanji_sentence_links",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_kanji_sentence_link", columnNames = {"kanji_detail_id", "sentence_id"}),
        indexes = @Index(name = "idx_ksl_char", columnList = "kanji_char")
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiSentenceLink extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_detail_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_ksl_kanji_detail"))
    KanjiDetail kanji;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sentence_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_ksl_sentence"))
    KanjiSentence sentence;

    @Column(name = "kanji_char", nullable = false, length = 16)
    String character;
}
