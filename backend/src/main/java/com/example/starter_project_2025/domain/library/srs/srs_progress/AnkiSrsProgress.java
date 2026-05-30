package com.example.starter_project_2025.domain.library.srs.srs_progress;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "anki_srs_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "deck_id", "flashcard_id"}),
        indexes = {
                @Index(name = "idx_anki_progress_due", columnList = "user_id, next_review_at"),
                @Index(name = "idx_anki_progress_flashcard", columnList = "flashcard_id")
        }
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("ANKI_SRS_PROGRESS")
@ResourceMenu(
        title = "SRS Progress",
        group = "Anki SRS",
        icon = "trending-up",
        url = "/anki/srs-progress",
        description = "Scheduling state of each card under SRS.",
        order = 1,
        permission = "ANKI_SRS_PROGRESS_READ"
)
@EntityLabel(name = "SRS Progress", plural = "SRS Progresses", description = "Anki SRS progress per user-card")
@AutoCrud(path = "anki/srs-progress")
@Filterable(fields = {"state", "lastRating", "isActive"})
@Sortable(fields = {"nextReviewAt", "lastReviewedAt", "memoryScore", "intervalDays"})
@AuditEnabled
public class AnkiSrsProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    Deck deck;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

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
