package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quizlet/card-progress")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizletCardProgress", description = "APIs for managing quizlet card progress")
public class QuizletCardProgressController {
}
