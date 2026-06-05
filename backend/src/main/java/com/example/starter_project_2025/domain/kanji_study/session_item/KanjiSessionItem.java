package com.example.starter_project_2025.domain.kanji_study.session_item;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.session.KanjiStudySession;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * One item (a kanji prompt + the learner's answer) within a {@link KanjiStudySession}.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_session_items")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_SESSION_ITEM")
@EntityLabel(name = "Kanji Session Item", plural = "Kanji Session Items", description = "An item inside a kanji study session")
@AutoCrud(path = "kanji-session-items")
@Filterable(fields = {"status", "isCorrect", "isActive"})
@Sortable(fields = {"itemOrder", "answeredAt", "createdAt"})
@SoftDelete
@AuditEnabled
public class KanjiSessionItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    KanjiStudySession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    KanjiDetail kanji;

    @Builder.Default
    @Column(name = "item_order", nullable = false)
    int itemOrder = 0;

    @Column(name = "user_answer", columnDefinition = "TEXT")
    String userAnswer;

    @Column(name = "is_correct")
    Boolean isCorrect;

    @Column(name = "response_time_ms")
    Integer responseTimeMs;

    @Column(name = "status", length = 16)
    String status;

    @Column(name = "answered_at")
    LocalDateTime answeredAt;
}
