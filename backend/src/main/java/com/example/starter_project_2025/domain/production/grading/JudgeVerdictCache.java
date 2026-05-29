package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentence;
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
@Table(name = "judge_verdict_caches",
        uniqueConstraints = @UniqueConstraint(columnNames = {"reference_sentence_id", "learner_answer_hash"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JudgeVerdictCache extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reference_sentence_id", nullable = false)
    ReferenceSentence referenceSentence;

    @Column(name = "learner_answer_hash", length = 64, nullable = false)
    String learnerAnswerHash;

    @Column(length = 20)
    String verdict;

    @Column
    Double score;

    @Column(columnDefinition = "TEXT")
    String feedback;
}
