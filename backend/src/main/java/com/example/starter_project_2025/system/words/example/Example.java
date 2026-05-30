package com.example.starter_project_2025.system.words.example;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.words.language.Language;
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
@Table(name = "examples")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("EXAMPLE")
@ResourceMenu(title = "Examples", group = "Japanese", icon = "file-text", url = "/examples", order = 8, description = "Example sentences attached to vocabulary.")
@AutoCrud(path = "examples")
public class Example extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "root_language", nullable = false)
    Language rootLanguage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_language", nullable = false)
    Language toLanguage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    Word word;

    @Column(name = "root_example")
    String rootExample;

    @Column(name = "to_example")
    String toExample;
}