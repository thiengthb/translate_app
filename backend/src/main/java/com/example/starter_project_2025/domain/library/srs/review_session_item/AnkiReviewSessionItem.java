package com.example.starter_project_2025.domain.library.srs.review_session_item;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.srs.review_session.AnkiReviewSession;
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
@Table(name = "anki_review_session_items")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("ANKI_REVIEW_SESSION_ITEM")
@ResourceMenu(
        title = "Session Items",
        group = "Anki SRS",
        icon = "clipboard-check",
        url = "/anki/session-items",
        description = "Cards queued within an Anki review session.",
        order = 3,
        permission = "ANKI_REVIEW_SESSION_ITEM_READ"
)
@EntityLabel(name = "Review Session Item", plural = "Review Session Items", description = "Items in an Anki review session")
@AutoCrud(path = "anki/session-items")
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"itemOrder", "answeredAt", "createdAt"})
@AuditEnabled
public class AnkiReviewSessionItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    AnkiReviewSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

    @Column(nullable = false)
    @FieldMeta(label = "Item Order", type = "number", required = true, order = 1, group = "Item")
    Integer itemOrder;

    @Builder.Default
    @Column(nullable = false, length = 30)
    @FieldMeta(label = "Status", type = "text", order = 2, group = "Item")
    String status = "PENDING";

    @Column
    LocalDateTime answeredAt;
}
