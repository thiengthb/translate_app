package com.example.starter_project_2025.domain.library.srs.review_session_item;

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
@RequestMapping("/api/anki/session-items")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiReviewSessionItem", description = "APIs for managing Anki review session items")
public class AnkiReviewSessionItemController
        extends BaseCrudDataIoController<AnkiReviewSessionItem, Long, AnkiReviewSessionItemDTO, AnkiReviewSessionItemFilter> {

    AnkiReviewSessionItemService ankiReviewSessionItemService;
    AnkiReviewSessionItemRepository ankiReviewSessionItemRepository;

    @Override
    protected BaseCrudService<Long, AnkiReviewSessionItemDTO, AnkiReviewSessionItemFilter> getService() {
        return ankiReviewSessionItemService;
    }

    @Override
    protected BaseCrudRepository<AnkiReviewSessionItem, Long> getRepository() {
        return ankiReviewSessionItemRepository;
    }

    @Override
    protected Class<AnkiReviewSessionItem> getEntityClass() {
        return AnkiReviewSessionItem.class;
    }
}
