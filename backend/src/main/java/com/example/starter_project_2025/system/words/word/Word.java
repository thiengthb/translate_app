package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.word_kanji.WordKanji;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "words")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("WORD")
public class Word extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "representation_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_words_representation"))
    Representation representation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meaning_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_words_meaning"))
    Meaning meaning;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_words_level"))
    Level level;

    @Column(name = "word", nullable = false)
    String word;

    @Column(name = "reading")
    String reading;

    @Column(name = "word_type")
    String wordType;

    @Column(name = "frequency")
    Integer frequency;

    @OneToMany(mappedBy = "word", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<WordKanji> wordKanjis;

    @OneToMany(mappedBy = "word", fetch = FetchType.LAZY)
    List<Example> examples;
}