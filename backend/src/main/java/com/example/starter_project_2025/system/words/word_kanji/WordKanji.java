package com.example.starter_project_2025.system.words.word_kanji;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.word.Word;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "word_kanjis")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("WORD_KANJI")
public class WordKanji extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_word_kanjis_word"))
    Word word;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_word_kanjis_kanji"))
    Kanji kanji;

    @Column(name = "kanji_char")
    String character;

    @Column(name = "onyomi", columnDefinition = "text")
    String onyomi;

    @Column(name = "kunyomi", columnDefinition = "text")
    String kunyomi;

    @Column(name = "meaning", columnDefinition = "text")
    String meaning;

    @Column(name = "stroke")
    Integer stroke;

    @Column(name = "radical")
    String radical;
}