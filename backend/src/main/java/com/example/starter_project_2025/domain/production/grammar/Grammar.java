package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.converter.StringListConverter;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.List;

/**
 * A grammar EXPRESSION (e.g. {@code ～うちに}) — the dictionary entry that groups
 * one or more {@link GrammarSubUse} "usages" (① ②). Detection/practice stay on the
 * usage; this layer is purely grouping + learner-facing dictionary content.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "grammars")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("GRAMMAR")
@ResourceMenu(title = "Biểu thức ngữ pháp", group = "Tiếng Nhật", icon = "book-marked", url = "/grammars", order = 10)
@Searchable(fields = {"form", "slug", "jlptLevel", "titleGloss"})
@AutoCrud(path = "grammars")
public class Grammar extends BaseEntity {

    /** Stable URL/identity key for the dictionary (e.g. {@code spot_n3_uchini}). */
    @Column(length = 120, nullable = false, unique = true)
    String slug;

    /** Surface form shown as the entry title, e.g. {@code ～うちに}. */
    @Column(length = 150, nullable = false)
    String form;

    @Column(length = 20)
    String jlptLevel;

    /** Short Vietnamese gloss summary for the list title. */
    @Column(columnDefinition = "TEXT")
    String titleGloss;

    /** Textbook source badges, e.g. {@code ["Shinkanzen","Mimikara","Soumatome"]}. */
    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    List<String> textbookSources;

    /** "Chú ý" — caveats / extra notes shown at the bottom of the entry. */
    @Column(columnDefinition = "TEXT")
    String notes;
}
