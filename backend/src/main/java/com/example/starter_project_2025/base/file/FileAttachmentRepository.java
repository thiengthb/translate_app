package com.example.starter_project_2025.base.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {

    List<FileAttachment> findByEntityNameAndEntityId(String entityName, Long entityId);

    List<FileAttachment> findByEntityNameAndEntityIdAndFieldName(
            String entityName, Long entityId, String fieldName);

    void deleteByEntityNameAndEntityId(String entityName, Long entityId);
}
