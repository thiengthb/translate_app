package com.example.starter_project_2025.system.streak;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "streak_activities",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_streak_activity_user_date",
                columnNames = {"user_id", "activity_date"}
        ),
        indexes = {
                @Index(name = "ix_streak_activity_user_date", columnList = "user_id, activity_date")
        }
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StreakActivity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(name = "activity_date", nullable = false)
    LocalDate activityDate;
}
