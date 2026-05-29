package com.example.starter_project_2025.domain.library.srs.review_session;

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
@Table(name = "anki_review_sessions")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("ANKI_REVIEW_SESSION")
@ResourceMenu(
        title = "Review Sessions",
        group = "Anki SRS",
        icon = "play",
        url = "/anki/review-sessions",
        order = 2,
        permission = "ANKI_REVIEW_SESSION_READ"
)
@EntityLabel(name = "Review Session", plural = "Review Sessions", description = "Anki review session")
@AutoCrud(path = "anki/review-sessions")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"startedAt", "endedAt", "createdAt"})
@AuditEnabled
public class AnkiReviewSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id")
    Deck deck;

    @Column(nullable = false)
    @FieldMeta(label = "Started At", type = "datetime", required = true, order = 1, group = "Session")
    LocalDateTime startedAt;

    @Column
    @FieldMeta(label = "Ended At", type = "datetime", order = 2, group = "Session")
    LocalDateTime endedAt;

    @Builder.Default
    @Column(nullable = false)
    Integer totalItems = 0;

    @Builder.Default
    @Column(nullable = false)
    Integer completedItems = 0;

    @Column
    Double averageScore;
}
