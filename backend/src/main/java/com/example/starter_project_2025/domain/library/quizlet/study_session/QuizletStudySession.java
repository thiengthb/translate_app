package com.example.starter_project_2025.domain.library.quizlet.study_session;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
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
@Table(name = "quizlet_study_sessions")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZLET_STUDY_SESSION")
@ResourceMenu(
        title = "Study Sessions",
        group = "Quizlet",
        icon = "play",
        url = "/quizlet/sessions",
        description = "Quizlet study sessions per user.",
        order = 2,
        permission = "QUIZLET_STUDY_SESSION_READ"
)
@EntityLabel(name = "Study Session", plural = "Study Sessions", description = "Quizlet study session management")
@AutoCrud(path = "quizlet/sessions")
@Filterable(fields = {"mode", "isActive"})
@Sortable(fields = {"startedAt", "endedAt", "createdAt"})
@AuditEnabled
public class QuizletStudySession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    Deck deck;

    @Column(length = 50)
    @FieldMeta(label = "Mode", type = "text", order = 1, group = "Session Info")
    String mode;

    @Column(nullable = false)
    @FieldMeta(label = "Started At", type = "datetime", required = true, order = 2, group = "Session Info")
    LocalDateTime startedAt;

    @Column
    @FieldMeta(label = "Ended At", type = "datetime", order = 3, group = "Session Info")
    LocalDateTime endedAt;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Total Items", type = "number", order = 4, group = "Session Info")
    int totalItems = 0;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Completed Items", type = "number", order = 5, group = "Session Info")
    int completedItems = 0;
}
