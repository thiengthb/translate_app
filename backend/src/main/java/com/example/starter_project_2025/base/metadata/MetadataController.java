package com.example.starter_project_2025.base.metadata;

import com.example.starter_project_2025.base.metadata.dto.EntityMetadataDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;

@RestController
@RequestMapping("/api/meta")
@RequiredArgsConstructor
public class MetadataController {

    private final MetadataScanner metadataScanner;

    @GetMapping("/entities")
    public ResponseEntity<Collection<EntityMetadataDTO>> getAllEntities() {
        return ResponseEntity.ok(metadataScanner.getAllMetadata().values());
    }

    @GetMapping("/entities/{name}")
    public ResponseEntity<EntityMetadataDTO> getEntity(@PathVariable String name) {
        return metadataScanner.getMetadata(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
