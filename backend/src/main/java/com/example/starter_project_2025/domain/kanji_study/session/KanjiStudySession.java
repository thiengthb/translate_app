package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeck;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * A Kanji study session (one of the 4 modes). The kanji feature's OWN study runtime,
 * separate from domain/library quizlet/anki sessions.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_study_sessions")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_STUDY_SESSION")
@EntityLabel(name = "Kanji Study Session", plural = "Kanji Study Sessions", description = "A kanji study session")
@AutoCrud(path = "kanji-study-sessions")
@Filterable(fields = {"mode", "isActive"})
@Sortable(fields = {"startedAt", "endedAt", "createdAt"})
@SoftDelete
@AuditEnabled
public class KanjiStudySession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id")
    KanjiDeck deck;

    @Column(name = "mode", nullable = false, length = 16)
    @FieldMeta(label = "Mode", type = "select", required = true, order = 1,
               placeholder = "FLASHCARD / QUIZ / WRITING / READING", group = "Session")
    String mode;

    @Column(name = "started_at")
    LocalDateTime startedAt;

    @Column(name = "ended_at")
    LocalDateTime endedAt;

    @Builder.Default
    @Column(name = "total_items", nullable = false)
    int totalItems = 0;

    @Builder.Default
    @Column(name = "completed_items", nullable = false)
    int completedItems = 0;
}
