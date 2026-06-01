package com.example.starter_project_2025.system.publicapi;

import com.example.starter_project_2025.system.menu.module.Module;
import com.example.starter_project_2025.system.menu.module.ModuleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Public", description = "Endpoints accessible without authentication")
public class PublicController {

    ModuleRepository moduleRepository;

    @GetMapping("/modules")
    @Operation(summary = "List active public modules (no auth required)")
    public ResponseEntity<List<PublicModuleResponse>> listPublicModules() {
        List<Module> modules = moduleRepository
                .findByIsActiveAndIsPublicOrderByDisplayOrderAscTitleAsc(true, true);

        List<PublicModuleResponse> response = modules.stream()
                .map(m -> new PublicModuleResponse(
                        m.getId(),
                        m.getTitle(),
                        m.getUrl(),
                        m.getIcon(),
                        m.getDescription(),
                        m.getDisplayOrder()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    public record PublicModuleResponse(
            Long id,
            String title,
            String url,
            String icon,
            String description,
            Integer displayOrder
    ) {}
}
