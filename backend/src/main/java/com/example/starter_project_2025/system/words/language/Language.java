package com.example.starter_project_2025.system.words.language;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.mean.Meaning;
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
@Table(name = "languages")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("LANGUAGE")
@ResourceMenu(title = "Languages", group = "Japanese", icon = "globe", url = "/languages", order = 6, description = "Languages used for meanings and example sentences.")
@AutoCrud(path = "languages")
public class Language extends BaseEntity {

    @Column(name = "code", unique = true, length = 10)
    String code;

    @Column(name = "name", nullable = false)
    String name;

    @OneToMany(mappedBy = "language", fetch = FetchType.LAZY)
    List<Meaning> meanings;

    @OneToMany(mappedBy = "rootLanguage", fetch = FetchType.LAZY)
    List<Example> rootExamples;

    @OneToMany(mappedBy = "toLanguage", fetch = FetchType.LAZY)
    List<Example> toExamples;
}