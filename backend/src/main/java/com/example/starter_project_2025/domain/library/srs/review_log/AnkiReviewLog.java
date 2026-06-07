package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfig;
import com.example.starter_project_2025.domain.library.srs.review_session_item.AnkiReviewSessionItem;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
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
@Table(name = "anki_review_logs")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("ANKI_REVIEW_LOG")
@ResourceMenu(
        title = "Review Logs",
        group = "Anki SRS",
        icon = "activity",
        url = "/anki/review-logs",
        description = "History of individual Anki card reviews.",
        order = 4,
        permission = "ANKI_REVIEW_LOG_READ"
)
@EntityLabel(name = "Review Log", plural = "Review Logs", description = "Anki review log audit trail")
@AutoCrud(path = "anki/review-logs")
@Filterable(fields = {"rating", "sourceType", "isActive"})
@Sortable(fields = {"reviewedAt", "createdAt"})
@AuditEnabled
public class AnkiReviewLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "progress_id", nullable = false)
    AnkiSrsProgress progress;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_item_id")
    AnkiReviewSessionItem sessionItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

    /** Deck the card belongs to — denormalised so logs can be queried per-deck
     *  (e.g. the future FSRS optimizer reads one deck's history at a time). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id")
    Deck deck;

    /** Algorithm preset in effect at review time. Null when the deck has no
     *  saved setting (pure SM-2 defaults). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "algorithm_config_id")
    SrsAlgorithmConfig algorithmConfig;

    @Column(nullable = false, length = 20)
    @FieldMeta(label = "Rating", type = "text", required = true, order = 1, group = "Review",
               placeholder = "AGAIN / HARD / GOOD / EASY")
    String rating;

    @Column
    Double score;

    @Column
    Integer timeTakenMs;

    @Column
    Integer expectedTimeMs;

    @Column
    Double oldMemoryScore;

    @Column
    Double newMemoryScore;

    @Column
    Double oldEaseFactor;

    @Column
    Double newEaseFactor;

    @Column
    Integer oldIntervalDays;

    @Column
    Integer newIntervalDays;

    @Column
    Integer oldReviewCount;

    @Column
    Integer newReviewCount;

    @Column
    Integer oldLapses;

    @Column
    Integer newLapses;

    @Column(length = 30)
    String oldState;

    @Column(length = 30)
    String newState;

    @Column(length = 50)
    String sourceType;

    @Column
    Long sourceId;

    @Column
    LocalDateTime reviewedAt;

    /* ──────────────────────────────────────────
       Algorithm + FSRS memory-state snapshot.

       Every review records which algorithm produced it plus a before/after
       snapshot of the FSRS memory state. For SM-2 reviews the FSRS columns stay
       null (SM-2 doesn't track D/S/R). These columns are the raw history the
       future FSRS optimizer consumes.
    ────────────────────────────────────────── */

    /** "SM2" or "FSRS" — the algorithm that scheduled this review. */
    @Column(name = "algorithm_type", length = 20)
    String algorithmType;

    /** Hash of the FSRS parameter set used (null for SM-2). Lets the optimizer
     *  tell which reviews were produced by which parameter generation. */
    @Column(name = "parameters_hash", length = 64)
    String parametersHash;

    /** Days actually elapsed since the previous review of this card (0 on the
     *  first review). FSRS needs this to compute retrievability. */
    @Column(name = "elapsed_days")
    Integer elapsedDays;

    @Column(name = "old_difficulty")
    Double oldDifficulty;

    @Column(name = "new_difficulty")
    Double newDifficulty;

    @Column(name = "old_stability")
    Double oldStability;

    @Column(name = "new_stability")
    Double newStability;

    @Column(name = "old_retrievability")
    Double oldRetrievability;

    @Column(name = "new_retrievability")
    Double newRetrievability;

    @Column(name = "old_scheduled_days")
    Integer oldScheduledDays;

    @Column(name = "new_scheduled_days")
    Integer newScheduledDays;
}
