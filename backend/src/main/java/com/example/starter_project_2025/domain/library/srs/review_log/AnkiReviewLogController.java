package com.example.starter_project_2025.domain.library.srs.review_log;

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
@RequestMapping("/api/anki/review-logs")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiReviewLog", description = "APIs for managing Anki review logs")
public class AnkiReviewLogController
        extends BaseCrudDataIoController<AnkiReviewLog, Long, AnkiReviewLogDTO, AnkiReviewLogFilter> {

    AnkiReviewLogService ankiReviewLogService;
    AnkiReviewLogRepository ankiReviewLogRepository;

    @Override
    protected BaseCrudService<Long, AnkiReviewLogDTO, AnkiReviewLogFilter> getService() {
        return ankiReviewLogService;
    }

    @Override
    protected BaseCrudRepository<AnkiReviewLog, Long> getRepository() {
        return ankiReviewLogRepository;
    }

    @Override
    protected Class<AnkiReviewLog> getEntityClass() {
        return AnkiReviewLog.class;
    }
}
