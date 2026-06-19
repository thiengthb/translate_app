package com.example.starter_project_2025.domain.kanji_study.detail_word;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.system.words.word.Word;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Join between a Kanji-Study kanji ({@link KanjiDetail}) and a vocabulary
 * {@link Word} that contains it. Owned by Kanji Study (references
 * {@code kanji_details}, NOT the shared dictionary {@code kanjis}), this powers
 * the per-kanji vocabulary sections on the kanji detail page: "Từ vựng",
 * "Từ được đề cử" and "Ví dụ phát âm".
 *
 * <p>{@code kanji_char} is denormalized so the read path can query by character
 * without joining {@code kanji_details}.</p>
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "kanji_detail_words",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_kanji_detail_word", columnNames = {"kanji_detail_id", "word_id"}),
        indexes = @Index(name = "idx_kdw_char", columnList = "kanji_char")
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiDetailWord extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_detail_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_kdw_kanji_detail"))
    KanjiDetail kanji;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_kdw_word"))
    Word word;

    @Column(name = "kanji_char", nullable = false, length = 16)
    String character;
}
