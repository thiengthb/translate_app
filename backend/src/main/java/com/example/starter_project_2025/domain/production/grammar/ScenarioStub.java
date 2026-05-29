package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
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
@Table(name = "scenario_stubs")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ScenarioStub extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @Column(columnDefinition = "TEXT")
    String situationContext;

    @Column(length = 30)
    String register;

    @Column(columnDefinition = "TEXT")
    String l1PromptTemplate;
}
