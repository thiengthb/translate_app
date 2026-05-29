package com.example.starter_project_2025.domain.production.prompt;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentence;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStub;
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
@Table(name = "prompt_caches")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromptCache extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    ScenarioStub scenario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reference_sentence_id", nullable = false)
    ReferenceSentence referenceSentence;

    @Column(columnDefinition = "TEXT", nullable = false)
    String l1Prompt;
}
