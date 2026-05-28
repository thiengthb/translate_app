package com.example.starter_project_2025.system.auth.twofactor;

import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Single-use backup codes a user can present in place of a TOTP code when
 * their authenticator app is unavailable. Codes are stored hashed
 * (same SHA-256 helper as refresh tokens) — never plaintext.
 *
 * Each code is independent; using one doesn't expire the others.
 */
@Entity
@Table(
        name = "recovery_codes",
        indexes = {
                @Index(name = "idx_recovery_user", columnList = "userId"),
                @Index(name = "idx_recovery_hash", columnList = "codeHash")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecoveryCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    User user;

    @Column(nullable = false, length = 128)
    String codeHash;

    @Column(nullable = false)
    boolean used;

    @CreationTimestamp
    @Column(updatable = false, nullable = false)
    LocalDateTime createdAt;
}
