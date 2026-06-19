package com.example.starter_project_2025.domain.kanji_study.deck;

import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeckOrganizeService.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Deck-scoped group/clipboard operations: split/merge study groups and
 * paste/remove kanji (the FE clipboard's copy & move flows).
 */
@RestController
@RequestMapping("/api/kanji-decks/{deckId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Deck Organize", description = "Split/merge kanji groups, paste/remove kanji in a deck")
public class KanjiDeckOrganizeController {

    KanjiDeckOrganizeService organizeService;

    @PostMapping("/groups/split")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_UPDATE')")
    public ResponseEntity<GroupOpResult> split(@PathVariable Long deckId,
            @RequestBody SplitGroupRequest request) {
        return ResponseEntity.ok(organizeService.split(deckId, request));
    }

    @PostMapping("/groups/merge")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_UPDATE')")
    public ResponseEntity<GroupOpResult> merge(@PathVariable Long deckId,
            @RequestBody(required = false) MergeGroupsRequest request) {
        return ResponseEntity.ok(organizeService.merge(deckId, request));
    }

    @PostMapping("/items/paste")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_CREATE')")
    public ResponseEntity<PasteResult> paste(@PathVariable Long deckId,
            @RequestBody KanjiIdsRequest request) {
        return ResponseEntity.ok(organizeService.paste(deckId, request));
    }

    @PostMapping("/items/remove")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_DELETE')")
    public ResponseEntity<RemoveResult> removeItems(@PathVariable Long deckId,
            @RequestBody KanjiIdsRequest request) {
        return ResponseEntity.ok(organizeService.removeItems(deckId, request));
    }
}
