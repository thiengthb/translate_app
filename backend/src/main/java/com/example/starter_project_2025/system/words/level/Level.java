package com.example.starter_project_2025.system.words.level;

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
@Table(name = "levels")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("LEVEL")
@ResourceMenu(title = "Cấp độ", group = "Tiếng Nhật", icon = "graduation-cap", url = "/levels", order = 5)
@AutoCrud(path = "levels")
public class Level extends BaseEntity {

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "code", unique = true)
    String code;

    @OneToMany(mappedBy = "level", fetch = FetchType.LAZY)
    List<Word> words;
}