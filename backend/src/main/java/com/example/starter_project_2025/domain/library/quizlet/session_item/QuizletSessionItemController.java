package com.example.starter_project_2025.domain.library.quizlet.session_item;

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
@RequestMapping("/api/quizlet/session-items")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizletSessionItem", description = "APIs for managing quizlet session items")
public class QuizletSessionItemController
        extends BaseCrudDataIoController<QuizletSessionItem, Long, QuizletSessionItemDTO, QuizletSessionItemFilter> {

    QuizletSessionItemService quizletSessionItemService;
    QuizletSessionItemRepository quizletSessionItemRepository;

    @Override
    protected BaseCrudService<Long, QuizletSessionItemDTO, QuizletSessionItemFilter> getService() {
        return quizletSessionItemService;
    }

    @Override
    protected BaseCrudRepository<QuizletSessionItem, Long> getRepository() {
        return quizletSessionItemRepository;
    }

    @Override
    protected Class<QuizletSessionItem> getEntityClass() {
        return QuizletSessionItem.class;
    }
}
