package com.example.starter_project_2025.domain.library.deck_item;

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
public class DeckItemController {
}
