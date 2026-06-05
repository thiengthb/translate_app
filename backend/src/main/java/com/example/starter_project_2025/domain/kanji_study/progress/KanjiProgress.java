package com.example.starter_project_2025.domain.kanji_study.progress;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Per-user learning state for a single kanji (lightweight SRS for the kanji feature,
 * separate from domain/library anki/SRS). One row per (user, kanji).
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_progress",
        uniqueConstraints = @UniqueConstraint(name = "uk_kanji_progress_user_kanji", columnNames = {"user_id", "kanji_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_PROGRESS")
@EntityLabel(name = "Kanji Progress", plural = "Kanji Progress", description = "Per-user kanji learning state")
@AutoCrud(path = "kanji-progress")
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"status", "nextReviewAt", "lastStudiedAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    KanjiDetail kanji;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 16)
    String status = "NEW";

    @Builder.Default
    @Column(name = "correct_count", nullable = false)
    int correctCount = 0;

    @Builder.Default
    @Column(name = "wrong_count", nullable = false)
    int wrongCount = 0;

    @Builder.Default
    @Column(name = "interval_days", nullable = false)
    int intervalDays = 0;

    @Builder.Default
    @Column(name = "ease_factor", nullable = false)
    Double easeFactor = 2.5;

    @Column(name = "next_review_at")
    LocalDateTime nextReviewAt;

    @Column(name = "last_studied_at")
    LocalDateTime lastStudiedAt;
}
