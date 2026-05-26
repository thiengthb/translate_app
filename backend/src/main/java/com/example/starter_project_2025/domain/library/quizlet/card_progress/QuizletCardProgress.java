package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
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
        name = "quizlet_card_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "deck_item_id"})
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZLET_CARD_PROGRESS")
@ResourceMenu(
        title = "Card Progress",
        group = "Quizlet",
        icon = "chart-bar",
        url = "/quizlet/card-progress",
        order = 1,
        permission = "QUIZLET_CARD_PROGRESS_READ"
)
@EntityLabel(name = "Card Progress", plural = "Card Progresses", description = "Quizlet card progress tracking")
@AutoCrud(path = "quizlet/card-progress")
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"lastStudiedAt", "correctCount", "wrongCount", "createdAt"})
@SoftDelete
@AuditEnabled
public class QuizletCardProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    Deck deck;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_item_id", nullable = false)
    DeckItem deckItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

    @Column(name = "word_id")
    Long wordId;

    @Builder.Default
    @Column(nullable = false, length = 30)
    @FieldMeta(label = "Status", type = "text", order = 1, group = "Progress")
    String status = "NOT_STUDIED";

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Correct Count", type = "number", order = 2, group = "Progress")
    int correctCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Wrong Count", type = "number", order = 3, group = "Progress")
    int wrongCount = 0;

    @Column
    Boolean lastAnswerCorrect;

    @Column
    LocalDateTime lastStudiedAt;
}
