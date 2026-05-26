package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
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
public class QuizletCardProgressController
        extends BaseCrudDataIoController<QuizletCardProgress, Long, QuizletCardProgressDTO, QuizletCardProgressFilter> {

    QuizletCardProgressService quizletCardProgressService;
    QuizletCardProgressRepository quizletCardProgressRepository;

    @Override
    protected BaseCrudService<Long, QuizletCardProgressDTO, QuizletCardProgressFilter> getService() {
        return quizletCardProgressService;
    }

    @Override
    protected BaseCrudRepository<QuizletCardProgress, Long> getRepository() {
        return quizletCardProgressRepository;
    }

    @Override
    protected Class<QuizletCardProgress> getEntityClass() {
        return QuizletCardProgress.class;
    }
}
