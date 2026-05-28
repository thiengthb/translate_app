package com.example.starter_project_2025.base.file;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    @Value("${app.file.max-size:10485760}")
    private long maxFileSize;

    private final Cloudinary cloudinary;
    private final FileAttachmentRepository fileAttachmentRepository;

    @Transactional
    public FileAttachment upload(MultipartFile file, String entityName, Long entityId, String fieldName) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        if (file.getSize() > maxFileSize) {
            throw new BadRequestException("File size exceeds maximum allowed size");
        }

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");
        if (originalName.contains("..")) {
            throw new BadRequestException("Invalid file name");
        }

        String uuid = UUID.randomUUID().toString();
        String folder = (entityName != null && !entityName.isBlank()) ? entityName : "uploads";
        String publicId = folder + "/" + uuid;

        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", "auto",
                    "overwrite", false
            ));

            String secureUrl = (String) result.get("secure_url");

            FileAttachment attachment = FileAttachment.builder()
                    .originalName(originalName)
                    .storedName(uuid)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .storagePath(publicId)
                    .storageType("CLOUDINARY")
                    .entityName(entityName)
                    .entityId(entityId)
                    .fieldName(fieldName)
                    .url(secureUrl)
                    .build();

            return fileAttachmentRepository.save(attachment);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to Cloudinary", e);
        }
    }

    public FileAttachment getByStoredName(String storedName) {
        return fileAttachmentRepository.findAll().stream()
                .filter(f -> f.getStoredName().equals(storedName))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
    }

    public List<FileAttachment> getByEntity(String entityName, Long entityId) {
        return fileAttachmentRepository.findByEntityNameAndEntityId(entityName, entityId);
    }

    @Transactional
    public void delete(Long fileId) {
        FileAttachment attachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        try {
            cloudinary.uploader().destroy(
                    attachment.getStoragePath(),
                    ObjectUtils.asMap("resource_type", cloudinaryResourceType(attachment.getContentType()))
            );
        } catch (IOException e) {
            log.error("Failed to delete file from Cloudinary: {}", attachment.getStoragePath(), e);
        }

        fileAttachmentRepository.delete(attachment);
    }

    private String cloudinaryResourceType(String mimeType) {
        if (mimeType == null) return "raw";
        if (mimeType.startsWith("image/")) return "image";
        if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) return "video";
        return "raw";
    }
}
