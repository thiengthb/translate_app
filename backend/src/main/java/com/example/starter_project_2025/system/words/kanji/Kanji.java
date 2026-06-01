package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.base.dataio.exporter.annotation.ExportEntity;
import com.example.starter_project_2025.base.dataio.exporter.annotation.ExportField;
import com.example.starter_project_2025.base.dataio.importer.annotation.ImportField;
import com.example.starter_project_2025.base.dataio.template.annotation.ImportEntity;
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
@ImportEntity("kanji")
@ExportEntity(fileName = "kanjis", sheetName = "Kanji")
@ResourcePermission("KANJI")
@ResourceMenu(title = "Kanji", group = "Language", icon = "book-open", url = "/kanjis", order = 2, description = "Kanji characters with readings, meanings and stroke info.")
@AutoCrud(path = "kanjis")
public class Kanji extends BaseEntity {

    @Column(name = "kanji_char", nullable = false, unique = true)
    @ImportField(name = "Character", required = true)
    @ExportField(name = "Character")
    String character;

    @Column(name = "onyomi", columnDefinition = "text")
    @ImportField(name = "Onyomi")
    @ExportField(name = "Onyomi")
    String onyomi;

    @Column(name = "kunyomi", columnDefinition = "text")
    @ImportField(name = "Kunyomi")
    @ExportField(name = "Kunyomi")
    String kunyomi;

    @Column(name = "meaning", columnDefinition = "text")
    @ImportField(name = "Meaning")
    @ExportField(name = "Meaning")
    String meaning;

    @Column(name = "jlpt_level")
    @ImportField(name = "JLPT Level")
    @ExportField(name = "JLPT Level")
    String jlptLevel;

    @Column(name = "stroke")
    @ImportField(name = "Stroke")
    @ExportField(name = "Stroke")
    Integer stroke;

    @Column(name = "radical")
    @ImportField(name = "Radical")
    @ExportField(name = "Radical")
    String radical;

    @OneToMany(mappedBy = "kanji", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<WordKanji> wordKanjis;
}