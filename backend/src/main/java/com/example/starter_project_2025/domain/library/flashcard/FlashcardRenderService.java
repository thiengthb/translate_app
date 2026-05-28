package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renders a flashcard's front/back HTML.
 *
 * Template resolution order:
 *   1. Find the deck containing this flashcard (via deck_items).
 *      If the deck has a templateId → use that template.
 *   2. Otherwise, look up the system default template for the flashcard's cardType.
 *   3. If nothing matches → return empty HTML (frontend falls back to plain rendering).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FlashcardRenderService {

    private static final Pattern LABEL_TOKEN = Pattern.compile("\\{\\{\\s*([^}]+?)\\s*}}");

    FlashcardRepository flashcardRepository;
    FlashcardTemplateRepository flashcardTemplateRepository;
    DeckItemRepository deckItemRepository;
    DeckRepository deckRepository;

    public FlashcardRenderDTO renderCard(Long flashcardId) {

        Flashcard flashcard = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard not found"));

        FlashcardTemplate template = resolveTemplate(flashcard);

        if (template == null) {
            return FlashcardRenderDTO.builder()
                    .flashcardId(flashcardId)
                    .frontHtml("")
                    .backHtml("")
                    .styling(null)
                    .templateId(null)
                    .build();
        }

        Map<String, String> frontLabels = buildLabelMap(flashcard, SideType.FRONT);
        Map<String, String> backLabels = buildLabelMap(flashcard, SideType.BACK);

        return FlashcardRenderDTO.builder()
                .flashcardId(flashcardId)
                .frontHtml(applyTemplate(template.getFrontTemplate(), frontLabels))
                .backHtml(applyTemplate(template.getBackTemplate(), backLabels))
                .styling(template.getStyling())
                .templateId(template.getId())
                .build();
    }

    /**
     * Walk the resolution order:
     *   deck.template → system default by cardType → null
     */
    private FlashcardTemplate resolveTemplate(Flashcard flashcard) {

        Optional<DeckItem> deckItem = deckItemRepository.findFirstByFlashcardId(flashcard.getId());
        if (deckItem.isPresent() && deckItem.get().getDeck() != null) {
            Long deckId = deckItem.get().getDeck().getId();
            Optional<Deck> deck = deckRepository.findById(deckId);
            if (deck.isPresent() && deck.get().getTemplateId() != null) {
                Optional<FlashcardTemplate> deckTemplate =
                        flashcardTemplateRepository.findById(deck.get().getTemplateId());
                if (deckTemplate.isPresent()) {
                    return deckTemplate.get();
                }
            }
        }

        String cardType = flashcard.getCardType();
        if (cardType != null && !cardType.isBlank()) {
            return flashcardTemplateRepository
                    .findByCardTypeAndIsDefaultTrueAndIsSystemTrue(cardType)
                    .orElse(null);
        }
        return null;
    }

    /**
     * Build label → first non-deleted contentValue map for a given side.
     * First occurrence per label wins (so duplicates in the card don't override).
     */
    private Map<String, String> buildLabelMap(Flashcard flashcard, SideType sideType) {
        Map<String, String> map = new LinkedHashMap<>();
        if (flashcard.getSides() == null) return map;
        for (FlashcardSide side : flashcard.getSides()) {
            if (side.getSide() != sideType) continue;
            if (side.getContents() == null) continue;
            for (FlashcardSideContent content : side.getContents()) {
                if (Boolean.TRUE.equals(content.getIsDeleted())) continue;
                String label = content.getLabel();
                String value = content.getContentValue();
                if (label == null || label.isBlank()) continue;
                if (value == null) continue;
                map.putIfAbsent(label.trim(), value);
            }
        }
        return map;
    }

    /**
     * Substitute {{label}} tokens in the template string with values from the label map.
     * Missing labels resolve to empty string (keeps the page rendering rather than
     * leaving raw tokens in the output).
     */
    private String applyTemplate(String template, Map<String, String> labelMap) {
        if (template == null || template.isEmpty()) return "";
        Matcher m = LABEL_TOKEN.matcher(template);
        StringBuilder out = new StringBuilder();
        Map<String, String> caseInsensitive = new HashMap<>();
        for (Map.Entry<String, String> e : labelMap.entrySet()) {
            caseInsensitive.put(e.getKey().toLowerCase(), e.getValue());
        }
        while (m.find()) {
            String label = m.group(1).trim();
            String replacement = labelMap.get(label);
            if (replacement == null) {
                replacement = caseInsensitive.get(label.toLowerCase());
            }
            m.appendReplacement(out, Matcher.quoteReplacement(replacement != null ? replacement : ""));
        }
        m.appendTail(out);
        return out.toString();
    }
}
