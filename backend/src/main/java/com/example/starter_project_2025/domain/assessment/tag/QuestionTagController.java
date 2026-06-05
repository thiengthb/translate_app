package com.example.starter_project_2025.domain.assessment.tag;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Standard CRUD for {@code /api/question-tags} is provided automatically by the
 * {@code @AutoCrud} registrar (list, get, create, update, delete). This explicit
 * controller exists to anchor the resource for Swagger and to host any future
 * custom sub-routes.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/question-tags")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuestionTag", description = "APIs for managing question tags")
public class QuestionTagController {
}
