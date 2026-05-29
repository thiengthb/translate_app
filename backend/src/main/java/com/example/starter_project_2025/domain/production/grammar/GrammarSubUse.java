package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.converter.CommonMistakesConverter;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
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
@Table(name = "grammar_sub_uses")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarSubUse extends BaseEntity {

    @Column(length = 100, nullable = false)
    String name;

    @Column(length = 10)
    String jlptLevel;

    @Column(columnDefinition = "TEXT")
    String nuanceDescription;

    @Column(length = 100, nullable = false, unique = true)
    String detectorKey;

    @Convert(converter = CommonMistakesConverter.class)
    @Column(columnDefinition = "TEXT")
    List<CommonMistake> commonMistakes;
}
