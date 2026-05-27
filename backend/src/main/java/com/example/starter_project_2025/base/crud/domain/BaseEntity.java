package com.example.starter_project_2025.base.crud.domain;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@SuperBuilder
@MappedSuperclass
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    protected Long id;

    @Builder.Default
    @Column(nullable = false)
    protected Boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    protected Boolean isDeleted = false;

    @Version
    @Builder.Default
    protected Long version = 0L;

    @Column
    protected Long tenantId;

    @CreationTimestamp
    @Column(updatable = false, nullable = false)
    protected LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    protected LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false)
    protected Long createdBy;

    @LastModifiedBy
    protected Long updatedBy;

    /**
     * Apply non-null defaults for @Builder.Default-annotated flags before INSERT.
     *
     * Lombok's @SuperBuilder strips the field initializer for any field marked
     * with @Builder.Default — only the builder applies the default. Construction
     * paths that bypass the builder (no-args constructor + setters, MapStruct,
     * Jackson deserialization) leave these fields null, which violates the
     * NOT NULL columns and crashes the INSERT.
     */
    @PrePersist
    void applyBaseDefaults() {
        if (isActive == null) isActive = true;
        if (isDeleted == null) isDeleted = false;
        if (version == null) version = 0L;
    }
}