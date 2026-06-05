package com.example.starter_project_2025.system.reward;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Immutable audit row recording a reward grant (exp + coins) to a user from a
 * source action. The {@code (user_id, source_type, source_id)} unique
 * constraint enforces one grant per source — the basis for idempotency.
 */
@Entity
@Table(name = "user_reward_logs",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_reward_attempt",
                columnNames = {"user_id", "source_type", "source_id"}))
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@AutoCrud(path = "reward-logs")
@ResourcePermission("REWARD_LOG")
public class UserRewardLog extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    Long userId;

    /** e.g. "QUIZ_ATTEMPT" */
    @Column(name = "source_type", nullable = false, length = 50)
    String sourceType;

    /** The attemptId (or other source entity id) the reward came from. */
    @Column(name = "source_id", nullable = false)
    Long sourceId;

    @Column(name = "exp_granted", nullable = false)
    Long expGranted;

    @Column(name = "coins_granted", nullable = false)
    Long coinsGranted;

    /** Snapshot for display, e.g. "Quiz attempt — 80.0% (PASSED)". */
    @Column(length = 255)
    String description;
}
