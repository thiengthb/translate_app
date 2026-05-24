package com.example.starter_project_2025.base.file;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    @Value("${app.file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.file.max-size:10485760}")
    private long maxFileSize;

    @Value("${app.backend-domain:http://localhost:8080}")
    private String backendDomain;

    private final FileAttachmentRepository fileAttachmentRepository;

    @Transactional
    public FileAttachment upload(MultipartFile file, String entityName, Long entityId, String fieldName) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new BadRequestException("File size exceeds maximum allowed size");
        }

        String originalName = StringUtils.cleanPath(file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "unnamed");

        // Sanitize filename
        if (originalName.contains("..")) {
            throw new BadRequestException("Invalid file name");
        }

        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalName.substring(dotIndex);
        }

        String storedName = UUID.randomUUID() + extension;
        Path targetDir = Paths.get(uploadDir, entityName);

        try {
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(storedName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            FileAttachment attachment = FileAttachment.builder()
                    .originalName(originalName)
                    .storedName(storedName)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .storagePath(targetPath.toString())
                    .storageType("LOCAL")
                    .entityName(entityName)
                    .entityId(entityId)
                    .fieldName(fieldName)
                    .url(backendDomain + "/api/files/" + storedName)
                    .build();

            return fileAttachmentRepository.save(attachment);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public Resource download(String storedName) {
        FileAttachment attachment = fileAttachmentRepository.findAll().stream()
                .filter(f -> f.getStoredName().equals(storedName))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        try {
            Path filePath = Paths.get(attachment.getStoragePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new ResourceNotFoundException("File not found on disk");
        } catch (MalformedURLException e) {
            throw new RuntimeException("File path error", e);
        }
    }

    public List<FileAttachment> getByEntity(String entityName, Long entityId) {
        return fileAttachmentRepository.findByEntityNameAndEntityId(entityName, entityId);
    }

    @Transactional
    public void delete(Long fileId) {
        FileAttachment attachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        try {
            Path filePath = Paths.get(attachment.getStoragePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error("Failed to delete file from disk: {}", attachment.getStoragePath(), e);
        }

        fileAttachmentRepository.delete(attachment);
    }
}
