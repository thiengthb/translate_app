package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
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
}
