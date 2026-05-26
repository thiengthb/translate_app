package com.example.starter_project_2025.domain.library.deck;

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
@RequestMapping("/api/decks")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Deck", description = "APIs for managing study decks")
public class DeckController
        extends BaseCrudDataIoController<Deck, Long, DeckDTO, DeckFilter> {

    DeckService deckService;
    DeckRepository deckRepository;

    @Override
    protected BaseCrudService<Long, DeckDTO, DeckFilter> getService() {
        return deckService;
    }

    @Override
    protected BaseCrudRepository<Deck, Long> getRepository() {
        return deckRepository;
    }

    @Override
    protected Class<Deck> getEntityClass() {
        return Deck.class;
    }
}
