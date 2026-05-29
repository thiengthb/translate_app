package com.example.starter_project_2025.base.file;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<FileAttachment> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String fieldName) {
        return ResponseEntity.ok(fileStorageService.upload(file, entityName, entityId, fieldName));
    }

    @GetMapping("/{storedName}")
    public ResponseEntity<Void> download(@PathVariable String storedName) {
        FileAttachment attachment = fileStorageService.getByStoredName(storedName);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, attachment.getUrl())
                .build();
    }

    @GetMapping("/entity/{entityName}/{entityId}")
    public ResponseEntity<List<FileAttachment>> getByEntity(
            @PathVariable String entityName,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(fileStorageService.getByEntity(entityName, entityId));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> delete(@PathVariable Long fileId) {
        fileStorageService.delete(fileId);
        return ResponseEntity.noContent().build();
    }
}
