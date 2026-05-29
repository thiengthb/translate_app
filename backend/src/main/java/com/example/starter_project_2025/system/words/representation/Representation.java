package com.example.starter_project_2025.system.words.representation;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.words.word.Word;
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
@Table(name = "representations")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("REPRESENTATION")
@ResourceMenu(title = "Kiểu chữ", group = "Tiếng Nhật", icon = "type", url = "/representations", order = 4)
@AutoCrud(path = "representations")
public class Representation extends BaseEntity {

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "code", unique = true)
    String code;

    @OneToMany(mappedBy = "representation", fetch = FetchType.LAZY)
    List<Word> words;
}