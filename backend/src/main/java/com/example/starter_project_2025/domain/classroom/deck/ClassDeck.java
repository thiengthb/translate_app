package com.example.starter_project_2025.domain.classroom.deck;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
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
@Table(name = "class_decks", uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "deck_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("CLASS_DECK")
@EntityLabel(name = "Class Deck", plural = "Class Decks", description = "Decks shared in a classroom")
@AutoCrud(path = "class-decks")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"addedAt"})
@AuditEnabled
public class ClassDeck extends BaseEntity {

    @Column(name = "class_id", nullable = false)
    Long classroomId;

    @Column(name = "deck_id", nullable = false)
    Long deckId;

    @Column(name = "added_by", nullable = false)
    Long addedBy;

    @Column(name = "added_at", nullable = false)
    LocalDateTime addedAt;
}
