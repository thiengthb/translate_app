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

    /* ──────────────────────────────────────────
       Scheduler discriminator + FSRS memory-state fields.

       SM-2 uses `easeFactor` + `intervalDays`.
       FSRS uses difficulty / stability / retrievability driven by a
       desired-retention target. These columns are nullable so existing SM-2
       rows are unaffected; only FSRS-scheduled cards populate them.
    ────────────────────────────────────────── */

    /** Which algorithm last scheduled this card: "SM2" (default) or "FSRS". */
    @Builder.Default
    @Column(name = "algorithm_type", nullable = false, length = 20)
    String algorithmType = "SM2";

    /** FSRS: inherent difficulty of the card for this user. */
    @Column
    Double difficulty;

    /** FSRS: memory stability — days for recall probability to fall to ~90%. */
    @Column
    Double stability;

    /** FSRS: retrievability — recall probability at the last computation. */
    @Column
    Double retrievability;

    /** FSRS: interval the card was scheduled for, in days. */
    @Column(name = "scheduled_days")
    Integer scheduledDays;

    /** FSRS: days elapsed between the previous two reviews. */
    @Column(name = "elapsed_days")
    Integer elapsedDays;

    /* ──────────────────────────────────────────
       Leech handling (Anki-style).

       A "leech" is a card the user keeps forgetting (lapses ≥ the deck's
       leech_threshold). It is auto-flagged on the lapse that crosses the
       threshold, and — if the deck enables suspend-leeches — also suspended.
       Suspended cards are hidden from the study queue until manually resumed.

       NOTE: intentionally NULLABLE (no NOT NULL) — the default active profile is
       MySQL with ddl-auto=update, and adding a NOT NULL column without a DB
       default to a table that already has rows fails on startup. Null is read as
       false everywhere (Boolean.TRUE.equals).
    ────────────────────────────────────────── */

    /** True once the card's lapses reach the deck's leech threshold. */
    @Builder.Default
    @Column(name = "is_leech")
    @FieldMeta(label = "Leech", type = "checkbox", order = 7, group = "SRS")
    Boolean isLeech = false;

    /** Suspended cards are excluded from study until manually resumed. */
    @Builder.Default
    @Column
    @FieldMeta(label = "Suspended", type = "checkbox", order = 8, group = "SRS")
    Boolean suspended = false;
}
