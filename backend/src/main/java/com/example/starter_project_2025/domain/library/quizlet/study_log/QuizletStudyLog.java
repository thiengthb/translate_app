package com.example.starter_project_2025.domain.library.quizlet.study_log;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.quizlet.session_item.QuizletSessionItem;
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
@Table(name = "quizlet_study_logs")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZLET_STUDY_LOG")
@ResourceMenu(
        title = "Study Logs",
        group = "Quizlet",
        icon = "activity",
        url = "/quizlet/study-logs",
        description = "History of completed Quizlet study attempts.",
        order = 4,
        permission = "QUIZLET_STUDY_LOG_READ"
)
@EntityLabel(name = "Study Log", plural = "Study Logs", description = "Quizlet study log history")
@AutoCrud(path = "quizlet/study-logs")
@Filterable(fields = {"result", "isActive"})
@Sortable(fields = {"studiedAt", "createdAt"})
@AuditEnabled
public class QuizletStudyLog extends BaseEntity {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_item_id")
    QuizletSessionItem sessionItem;

    @Column(length = 30)
    @FieldMeta(label = "Result", type = "text", order = 1, group = "Log Info")
    String result;

    @Column
    Integer responseTimeMs;

    @Column
    @FieldMeta(label = "Studied At", type = "datetime", order = 2, group = "Log Info")
    LocalDateTime studiedAt;
}
