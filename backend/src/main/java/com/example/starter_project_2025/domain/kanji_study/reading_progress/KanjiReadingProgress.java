package com.example.starter_project_2025.domain.kanji_study.reading_progress;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.reading_passage.KanjiReadingPassage;
import com.example.starter_project_2025.domain.kanji_study.reading_set.KanjiReadingSet;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Per-user progress through a {@link KanjiReadingSet} (and optionally a specific passage).
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_reading_progress")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_READING_PROGRESS")
@EntityLabel(name = "Kanji Reading Progress", plural = "Kanji Reading Progress", description = "Per-user reading set progress")
@AutoCrud(path = "kanji-reading-progress")
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"status", "completedAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiReadingProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "set_id", nullable = false)
    KanjiReadingSet readingSet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passage_id")
    KanjiReadingPassage passage;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 16)
    String status = "NEW";

    @Column(name = "completed_at")
    LocalDateTime completedAt;
}
