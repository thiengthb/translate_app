package com.example.starter_project_2025.system.words.mean;

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
@Table(name = "meanings")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("MEANING")
@ResourceMenu(title = "Meanings", group = "Japanese", icon = "message", url = "/meanings", order = 3, description = "Word meanings/translations per language.")
@AutoCrud(path = "meanings")
public class Meaning extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "language_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_meanings_language"))
    Language language;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_meanings_word"))
    Word word;

    @Column(name = "name", nullable = false, columnDefinition = "text")
    String name;
}