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
     * Enforce defaults for flag/version columns before persisting.
     * Needed because MapStruct's generated {@code toEntity(dto)} (and
     * {@link com.example.starter_project_2025.base.crud.mapper.DefaultCrudMapper})
     * call the no-args constructor — which, due to Lombok {@code @Builder.Default},
     * leaves these fields null — and then copy from the (read-only ⇒ null) DTO
     * values, dropping the initializers. Without this hook, inserts fail on the
     * NOT NULL {@code is_deleted} / {@code is_active} columns.
     */
    @PrePersist
    protected void applyDefaultsBeforePersist() {
        if (isActive == null)  isActive = Boolean.TRUE;
        if (isDeleted == null) isDeleted = Boolean.FALSE;
        if (version == null)   version = 0L;
    }
}
