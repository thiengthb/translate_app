package com.example.starter_project_2025.domain.grammar.goal;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Per-user daily learning goal for grammar (Anki/Bunpro style: a cap on how many
 * NEW grammar points and reviews to surface per day). One row per user.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "grammar_goals", uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarGoal extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    Long userId;

    @Builder.Default
    @Column(nullable = false)
    Integer newPerDay = 5;

    @Builder.Default
    @Column(nullable = false)
    Integer reviewsPerDay = 50;
}
