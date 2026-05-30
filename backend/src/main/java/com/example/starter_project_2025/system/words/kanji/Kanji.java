package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
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
@ResourceMenu(title = "Kanji", group = "Japanese", icon = "book-open", url = "/kanjis", order = 2, description = "Kanji characters with readings, meanings and stroke info.")
@AutoCrud(path = "kanjis")
public class Kanji extends BaseEntity {

    @Column(name = "kanji_char", nullable = false, unique = true)
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