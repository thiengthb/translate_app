package com.example.starter_project_2025.domain.library.favorite_deck;

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
@RequestMapping("/api/favorite-decks")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "FavoriteDeck", description = "APIs for managing favorite decks")
public class FavoriteDeckController
        extends BaseCrudDataIoController<FavoriteDeck, Long, FavoriteDeckDTO, FavoriteDeckFilter> {

    FavoriteDeckService favoriteDeckService;
    FavoriteDeckRepository favoriteDeckRepository;

    @Override
    protected BaseCrudService<Long, FavoriteDeckDTO, FavoriteDeckFilter> getService() {
        return favoriteDeckService;
    }

    @Override
    protected BaseCrudRepository<FavoriteDeck, Long> getRepository() {
        return favoriteDeckRepository;
    }

    @Override
    protected Class<FavoriteDeck> getEntityClass() {
        return FavoriteDeck.class;
    }
}
