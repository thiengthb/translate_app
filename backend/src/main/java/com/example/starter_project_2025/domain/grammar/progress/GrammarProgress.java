package com.example.starter_project_2025.domain.grammar.progress;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Per-user spaced-repetition state for one grammar usage (the "SRS state" layer).
 *
 * <p>Keyed to the pre-existing {@link GrammarSubUse} (the "grammar point" unit
 * the production module already owns, with its detectorKey + examples). This is
 * a read-only reference — the grammar module never modifies the production
 * module; it only layers long-term scheduling on top of it.</p>
 *
 * <p>Field shape mirrors the Anki SRS engine so the in-module
 * {@link com.example.starter_project_2025.domain.grammar.scheduler.GrammarScheduler}
 * can run the same SM2 logic, in its own independent table.</p>
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "grammar_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "sub_use_id"}),
        indexes = {
                @Index(name = "idx_grammar_progress_due", columnList = "user_id, next_review_at"),
                @Index(name = "idx_grammar_progress_sub_use", columnList = "sub_use_id")
        }
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("GRAMMAR_PROGRESS")
@ResourceMenu(
        title = "Grammar Progress",
        group = "Grammar Learning",
        icon = "trending-up",
        url = "/grammar/progress",
        description = "Per-user SRS state of each grammar usage.",
        order = 2,
        permission = "GRAMMAR_PROGRESS_READ"
)
@EntityLabel(name = "Grammar Progress", plural = "Grammar Progresses",
             description = "Grammar SRS progress per user-grammar")
@AutoCrud(path = "grammar/progress")
@Filterable(fields = {"state", "lastRating", "isActive"})
@Sortable(fields = {"nextReviewAt", "lastReviewedAt", "memoryScore", "intervalDays"})
@AuditEnabled
public class GrammarProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @Builder.Default
    @Column(nullable = false, length = 30)
    @FieldMeta(label = "State", type = "text", order = 1, group = "SRS",
               placeholder = "NEW / LEARNING / REVIEW / RELEARNING")
    String state = "NEW";

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Memory Score", type = "number", order = 2, group = "SRS")
    Double memoryScore = 0.0;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Ease Factor", type = "number", order = 3, group = "SRS")
    Double easeFactor = 2.5;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Interval (days)", type = "number", order = 4, group = "SRS")
    Integer intervalDays = 0;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Review Count", type = "number", order = 5, group = "SRS")
    Integer reviewCount = 0;

    @Builder.Default
    @Column
    Integer learningStepIndex = 0;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Lapses", type = "number", order = 6, group = "SRS")
    Integer lapses = 0;

    @Column(length = 20)
    String lastRating;

    @Column
    LocalDateTime firstLearnedAt;

    @Column
    LocalDateTime lastReviewedAt;

    @Column
    LocalDateTime nextReviewAt;
}
