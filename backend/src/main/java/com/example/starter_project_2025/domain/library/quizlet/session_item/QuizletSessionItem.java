package com.example.starter_project_2025.domain.library.quizlet.session_item;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.quizlet.study_session.QuizletStudySession;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
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
@Table(name = "quizlet_session_items")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZLET_SESSION_ITEM")
@ResourceMenu(
        title = "Session Items",
        group = "Quizlet",
        icon = "list-checks",
        url = "/quizlet/session-items",
        order = 3,
        permission = "QUIZLET_SESSION_ITEM_READ"
)
@EntityLabel(name = "Session Item", plural = "Session Items", description = "Quizlet session item tracking")
@AutoCrud(path = "quizlet/session-items")
@Filterable(fields = {"status", "isCorrect", "isActive"})
@Sortable(fields = {"itemOrder", "answeredAt", "createdAt"})
@AuditEnabled
public class QuizletSessionItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    QuizletStudySession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_item_id", nullable = false)
    DeckItem deckItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

    @Column(name = "word_id")
    Long wordId;

    @Column(nullable = false)
    @FieldMeta(label = "Item Order", type = "number", required = true, order = 1, group = "Item Info")
    int itemOrder;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "User Answer", type = "textarea", order = 2, group = "Item Info")
    String userAnswer;

    @Column
    Boolean isCorrect;

    @Builder.Default
    @Column(nullable = false, length = 30)
    @FieldMeta(label = "Status", type = "text", order = 3, group = "Item Info")
    String status = "PENDING";

    @Column
    Integer responseTimeMs;

    @Column
    LocalDateTime answeredAt;
}
