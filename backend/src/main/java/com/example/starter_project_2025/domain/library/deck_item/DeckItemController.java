package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.crud.controller.BaseCrudController;
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
@RequestMapping("/api/deck-items")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "DeckItem", description = "APIs for managing deck items")
public class DeckItemController
        extends BaseCrudDataIoController<DeckItem, Long, DeckItemDTO, DeckItemFilter> {

    DeckItemService deckItemService;
    DeckItemRepository deckItemRepository;

    @Override
    protected BaseCrudService<Long, DeckItemDTO, DeckItemFilter> getService() {
        return deckItemService;
    }

    @Override
    protected BaseCrudRepository<DeckItem, Long> getRepository() {
        return deckItemRepository;
    }

    @Override
    protected Class<DeckItem> getEntityClass() {
        return DeckItem.class;
    }
}
