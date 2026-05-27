package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.base.crud.dto.OnUpdate;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Folder", description = "APIs for managing user folders")
public class FolderController {

    FolderService folderService;

    @GetMapping
    @PreAuthorize("hasAuthority('FOLDER_READ')")
    public ResponseEntity<Page<FolderDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute FolderFilter filter
    ) {
        return ResponseEntity.ok(folderService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FOLDER_READ')")
    public ResponseEntity<FolderDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(folderService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('FOLDER_CREATE')")
    public ResponseEntity<FolderDTO> create(
            @Validated(OnCreate.class) @RequestBody FolderDTO request
    ) {
        return ResponseEntity.ok(folderService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('FOLDER_UPDATE')")
    public ResponseEntity<FolderDTO> update(
            @PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody FolderDTO request
    ) {
        return ResponseEntity.ok(folderService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('FOLDER_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        folderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
