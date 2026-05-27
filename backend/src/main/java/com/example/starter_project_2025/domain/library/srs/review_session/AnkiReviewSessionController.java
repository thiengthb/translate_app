package com.example.starter_project_2025.domain.library.srs.review_session;

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
@RequestMapping("/api/anki/review-sessions")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiReviewSession", description = "APIs for managing Anki review sessions")
public class AnkiReviewSessionController
        extends BaseCrudDataIoController<AnkiReviewSession, Long, AnkiReviewSessionDTO, AnkiReviewSessionFilter> {

    AnkiReviewSessionService ankiReviewSessionService;
    AnkiReviewSessionRepository ankiReviewSessionRepository;

    @Override
    protected BaseCrudService<Long, AnkiReviewSessionDTO, AnkiReviewSessionFilter> getService() {
        return ankiReviewSessionService;
    }

    @Override
    protected BaseCrudRepository<AnkiReviewSession, Long> getRepository() {
        return ankiReviewSessionRepository;
    }

    @Override
    protected Class<AnkiReviewSession> getEntityClass() {
        return AnkiReviewSession.class;
    }
}
