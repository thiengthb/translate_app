package com.example.starter_project_2025.domain.library.quizlet.study_session;

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
@RequestMapping("/api/quizlet/sessions")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizletStudySession", description = "APIs for managing quizlet study sessions")
public class QuizletStudySessionController
        extends BaseCrudDataIoController<QuizletStudySession, Long, QuizletStudySessionDTO, QuizletStudySessionFilter> {

    QuizletStudySessionService quizletStudySessionService;
    QuizletStudySessionRepository quizletStudySessionRepository;

    @Override
    protected BaseCrudService<Long, QuizletStudySessionDTO, QuizletStudySessionFilter> getService() {
        return quizletStudySessionService;
    }

    @Override
    protected BaseCrudRepository<QuizletStudySession, Long> getRepository() {
        return quizletStudySessionRepository;
    }

    @Override
    protected Class<QuizletStudySession> getEntityClass() {
        return QuizletStudySession.class;
    }
}
