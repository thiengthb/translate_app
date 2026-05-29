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
@Table(name = "user_streaks")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserStreak extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    User user;

    @Builder.Default
    @Column(nullable = false)
    Integer currentStreak = 0;

    @Builder.Default
    @Column(nullable = false)
    Integer longestStreak = 0;

    @Builder.Default
    @Column(nullable = false)
    Integer totalActiveDays = 0;

    @Column
    LocalDate lastActivityDate;
}
