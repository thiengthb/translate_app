package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
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
@Table(name = "translation_attempts")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TranslationAttempt extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prompt_id", nullable = false)
    PromptCache prompt;

    @Column(columnDefinition = "TEXT")
    String userAnswerL2;

    @Column
    Boolean detectorPassed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marker_used_id")
    GrammarMarker markerUsed;

    @Column
    Double llmJudgeScore;

    @Column(length = 20)
    String llmJudgeVerdict;

    @Column(columnDefinition = "TEXT")
    String llmJudgeFeedback;

    @Column(length = 20)
    String finalVerdict;
}
