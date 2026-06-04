package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.session_item.KanjiSessionItem;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * A handwriting practice attempt for a kanji (stroke detection self-check is client-side;
 * this stores the outcome). Optionally tied to a {@link KanjiSessionItem}.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_writing_attempts")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_WRITING_ATTEMPT")
@EntityLabel(name = "Kanji Writing Attempt", plural = "Kanji Writing Attempts", description = "A handwriting practice attempt")
@AutoCrud(path = "kanji-writing-attempts")
@Filterable(fields = {"passed", "isActive"})
@Sortable(fields = {"accuracyScore", "createdAt"})
@SoftDelete
@AuditEnabled
public class KanjiWritingAttempt extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    KanjiDetail kanji;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_item_id")
    KanjiSessionItem sessionItem;

    @Column(name = "accuracy_score")
    Double accuracyScore;

    @Column(name = "strokes_drawn")
    Integer strokesDrawn;

    @Builder.Default
    @Column(name = "passed", nullable = false)
    Boolean passed = false;

    @Column(name = "attempt_data", columnDefinition = "LONGTEXT")
    String attemptData;
}
