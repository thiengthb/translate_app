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

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
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
     * Build label → rendered HTML map for a given side.
     *
     * Includes both:
     *   - Explicit label from {@code content.label}
     *   - Synthetic {@code Field1}, {@code Field2}, ... based on order (matches frontend)
     *
     * Media contents (IMAGE/AUDIO/VIDEO) are wrapped as the corresponding HTML element so
     * templates like <code>{{Field2}}</code> render an actual image instead of a raw URL.
     */
    private Map<String, String> buildLabelMap(Flashcard flashcard, SideType sideType) {
        Map<String, String> map = new LinkedHashMap<>();
        if (flashcard.getSides() == null) return map;

        for (FlashcardSide side : flashcard.getSides()) {
            if (side.getSide() != sideType) continue;
            if (side.getContents() == null) continue;

            List<FlashcardSideContent> sorted = new ArrayList<>();
            for (FlashcardSideContent c : side.getContents()) {
                if (Boolean.TRUE.equals(c.getIsDeleted())) continue;
                if (c.getContentValue() == null) continue;
                sorted.add(c);
            }
            sorted.sort(Comparator.comparingInt(FlashcardSideContent::getOrderIndex));

            for (int i = 0; i < sorted.size(); i++) {
                FlashcardSideContent content = sorted.get(i);
                String rendered = renderContentValue(content);

                String label = content.getLabel();
                if (label != null && !label.isBlank()) {
                    map.putIfAbsent(label.trim(), rendered);
                }
                // Synthetic field fallback — matches the frontend preview behavior
                map.putIfAbsent("Field" + (i + 1), rendered);
                map.putIfAbsent("field" + (i + 1), rendered);
            }
        }
        return map;
    }

    /** Wrap a content value into HTML based on its contentType (IMAGE → <img>, etc.). */
    private String renderContentValue(FlashcardSideContent content) {
        String value = content.getContentValue();
        if (value == null) return "";
        ContentType type = content.getContentType();
        if (type == null) return value;

        String attr = value
                .replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");

        return switch (type) {
            case IMAGE -> "<img src=\"" + attr + "\" alt=\"\" />";
            case AUDIO -> "<audio controls src=\"" + attr + "\"></audio>";
            case VIDEO -> "<video controls src=\"" + attr + "\"></video>";
            case TEXT, CLOZE -> value;
        };
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
