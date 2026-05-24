package com.example.starter_project_2025.base.file;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "file_attachments")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class FileAttachment extends BaseEntity {

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String storedName;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 500)
    private String storagePath;

    @Column(length = 20)
    @Builder.Default
    private String storageType = "LOCAL";

    @Column(length = 100)
    private String entityName;

    private Long entityId;

    @Column(length = 100)
    private String fieldName;

    @Column(length = 500)
    private String url;
}
