package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStub;
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
@Table(name = "scenario_recencies",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "scenario_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ScenarioRecency extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    ScenarioStub scenario;

    @Column(nullable = false)
    LocalDateTime lastShownAt;
}
