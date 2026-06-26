package com.example.starter_project_2025.domain.library.deckimport;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "import_batches")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportBatch extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id")
    Deck deck;

    @Column(name = "file_name", length = 255)
    String fileName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    ImportBatchStatus status;

    @Column(name = "total_rows", nullable = false)
    int totalRows;

    @Column(name = "created_rows", nullable = false)
    int createdRows;

    @Column(name = "updated_rows", nullable = false)
    int updatedRows;

    @Column(name = "skipped_rows", nullable = false)
    int skippedRows;

    @Column(name = "failed_rows", nullable = false)
    int failedRows;

    @Column(name = "duplicate_rows", nullable = false)
    int duplicateRows;

    @Column(name = "completed_at")
    LocalDateTime completedAt;
}
