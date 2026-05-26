package com.example.starter_project_2025.domain.library.quizlet.study_log;

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
@RequestMapping("/api/quizlet/study-logs")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizletStudyLog", description = "APIs for managing quizlet study logs")
public class QuizletStudyLogController
        extends BaseCrudDataIoController<QuizletStudyLog, Long, QuizletStudyLogDTO, QuizletStudyLogFilter> {

    QuizletStudyLogService quizletStudyLogService;
    QuizletStudyLogRepository quizletStudyLogRepository;

    @Override
    protected BaseCrudService<Long, QuizletStudyLogDTO, QuizletStudyLogFilter> getService() {
        return quizletStudyLogService;
    }

    @Override
    protected BaseCrudRepository<QuizletStudyLog, Long> getRepository() {
        return quizletStudyLogRepository;
    }

    @Override
    protected Class<QuizletStudyLog> getEntityClass() {
        return QuizletStudyLog.class;
    }
}
