package com.example.starter_project_2025.domain.assessment.category;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quiz-categories")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizCategory", description = "Quiz category taxonomy")
public class QuizCategoryController {

    QuizCategoryRepository repository;

    /** Returns the categories as a nested tree (roots with children). */
    @GetMapping("/tree")
    @Transactional(readOnly = true)
    public ResponseEntity<List<QuizCategoryDTO>> tree() {
        List<QuizCategory> all = repository.findByIsDeletedFalseOrderByOrderIndexAsc();

        Map<Long, QuizCategoryDTO> byId = new LinkedHashMap<>();
        for (QuizCategory entity : all) {
            byId.put(entity.getId(), toDto(entity));
        }

        List<QuizCategoryDTO> roots = new ArrayList<>();
        for (QuizCategoryDTO dto : byId.values()) {
            if (dto.getParentId() != null && byId.containsKey(dto.getParentId())) {
                byId.get(dto.getParentId()).getChildren().add(dto);
            } else {
                roots.add(dto);
            }
        }
        return ResponseEntity.ok(roots);
    }

    private QuizCategoryDTO toDto(QuizCategory entity) {
        QuizCategoryDTO dto = QuizCategoryDTO.builder()
                .parentId(entity.getParentId())
                .name(entity.getName())
                .code(entity.getCode())
                .description(entity.getDescription())
                .orderIndex(entity.getOrderIndex())
                .children(new ArrayList<>())
                .build();
        dto.setId(entity.getId());
        dto.setIsActive(entity.getIsActive());
        return dto;
    }
}
