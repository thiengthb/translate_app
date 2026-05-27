package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
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
@Table(name = "kanjis")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI")
public class Kanji extends BaseEntity {

    @Column(name = "character", nullable = false, unique = true)
    String character;

    @Column(name = "onyomi", columnDefinition = "text")
    String onyomi;

    @Column(name = "kunyomi", columnDefinition = "text")
    String kunyomi;

    @Column(name = "meaning", columnDefinition = "text")
    String meaning;

    @Column(name = "jlpt_level")
    String jlptLevel;

    @Column(name = "stroke")
    Integer stroke;

    @Column(name = "radical")
    String radical;

    @OneToMany(mappedBy = "kanji", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<WordKanji> wordKanjis;
}