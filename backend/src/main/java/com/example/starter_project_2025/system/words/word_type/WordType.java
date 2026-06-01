package com.example.starter_project_2025.system.words.word_type;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Part-of-speech / word category lookup (noun, verb, adjective…). Pure
 * auto-CRUD lookup table — Entity + DTO only; the framework generates the
 * repository, mapper, service and HTTP endpoints, plus WORD_TYPE_* permissions
 * and the sidebar menu entry.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "word_types")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("WORD_TYPE")
@ResourceMenu(
        title = "Word Types",
        group = "Language",
        icon = "tags",
        url = "/word-types",
        order = 9,
        description = "Parts of speech / word categories (noun, verb, adjective…)."
)
@Searchable(fields = {"name", "code", "description"})
@AutoCrud(path = "word-types")
public class WordType extends BaseEntity {

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "code", unique = true)
    String code;

    @Column(name = "description")
    String description;
}
