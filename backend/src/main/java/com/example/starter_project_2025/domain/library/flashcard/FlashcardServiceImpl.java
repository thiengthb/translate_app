package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FlashcardServiceImpl
        extends BaseCrudServiceImpl<Flashcard, Long, FlashcardDTO, FlashcardFilter>
        implements FlashcardService {

    FlashcardMapper flashcardMapper;
    FlashcardRepository flashcardRepository;
    FlashcardSideRepository flashcardSideRepository;
    FlashcardSideContentRepository flashcardSideContentRepository;

    @Override
    protected BaseCrudRepository<Flashcard, Long> getRepository() {
        return flashcardRepository;
    }

    @Override
    protected BaseCrudMapper<Flashcard, FlashcardDTO> getMapper() {
        return flashcardMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"hint", "explanation"};
    }

    /* ─────────────────────────────────────────
       Lifecycle hooks
    ───────────────────────────────────────── */

    @Override
    protected void beforeCreate(Flashcard flashcard, FlashcardDTO request, ValidationContext ctx) {
        flashcard.setSides(buildSidesFromRequest(flashcard, request));
        syncLegacyFields(flashcard, request);
    }

    @Override
    protected void beforeUpdate(Flashcard flashcard, FlashcardDTO request, ValidationContext ctx) {
        if (request.getSides() == null) return;

        // Build a lookup of currently persisted sides by their SideType
        Map<SideType, FlashcardSide> existingBySideType = new HashMap<>();
        for (FlashcardSide s : flashcard.getSides()) {
            existingBySideType.put(s.getSide(), s);
        }

        // Determine which side types are present in the incoming request
        Set<SideType> incomingTypes = new HashSet<>();
        for (FlashcardDTO.SideDTO sideDto : request.getSides()) {
            if (sideDto.getSide() != null) incomingTypes.add(sideDto.getSide());
        }

        // Drop sides that are no longer in the request (orphanRemoval handles the DELETE)
        flashcard.getSides().removeIf(s -> !incomingTypes.contains(s.getSide()));

        // Merge each requested side: reuse the existing entity if present, otherwise create a new one
        for (FlashcardDTO.SideDTO sideDto : request.getSides()) {
            FlashcardSide side = existingBySideType.get(sideDto.getSide());
            if (side == null) {
                side = FlashcardSide.builder()
                        .flashcard(flashcard)
                        .side(sideDto.getSide())
                        .contents(new ArrayList<>())
                        .build();
                flashcard.getSides().add(side);
            }

            // Replace contents in-place (orphanRemoval on FlashcardSide.contents deletes old rows)
            side.getContents().clear();
            if (sideDto.getContents() != null) {
                for (FlashcardDTO.ContentDTO contentDto : sideDto.getContents()) {
                    side.getContents().add(FlashcardSideContent.builder()
                            .side(side)
                            .contentType(contentDto.getContentType())
                            .contentValue(contentDto.getContentValue())
                            .orderIndex(contentDto.getOrderIndex())
                            .metadata(contentDto.getMetadata() != null
                                    ? new HashMap<>(contentDto.getMetadata()) : null)
                            .build());
                }
            }
        }

        syncLegacyFields(flashcard, request);
    }

    /* ─────────────────────────────────────────
       Content operations
    ───────────────────────────────────────── */

    @Override
    public FlashcardDTO.ContentDTO addContent(Long sideId, FlashcardDTO.ContentDTO request) {

        FlashcardSide side = flashcardSideRepository.findById(sideId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard side not found"));

        FlashcardSideContent content = FlashcardSideContent.builder()
                .side(side)
                .contentType(request.getContentType())
                .contentValue(request.getContentValue())
                .orderIndex(request.getOrderIndex())
                .metadata(request.getMetadata() != null ? new HashMap<>(request.getMetadata()) : null)
                .build();

        FlashcardSideContent saved = flashcardSideContentRepository.save(content);
        return flashcardMapper.contentToDto(saved);
    }

    @Override
    public void removeContent(Long contentId) {

        FlashcardSideContent content = flashcardSideContentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found"));

        // Honour the @SoftDelete annotation on the entity.
        content.setIsDeleted(true);
        flashcardSideContentRepository.save(content);
    }

    @Override
    public void reorderContents(Long sideId, List<Long> orderedContentIds) {

        if (orderedContentIds == null || orderedContentIds.isEmpty()) return;

        List<FlashcardSideContent> contents =
                flashcardSideContentRepository.findBySideIdOrderByOrderIndex(sideId);

        Map<Long, FlashcardSideContent> byId = new HashMap<>();
        for (FlashcardSideContent c : contents) byId.put(c.getId(), c);

        for (int i = 0; i < orderedContentIds.size(); i++) {
            FlashcardSideContent c = byId.get(orderedContentIds.get(i));
            if (c != null) c.setOrderIndex(i);
        }

        flashcardSideContentRepository.saveAll(contents);
    }

    /* ─────────────────────────────────────────
       After-read: populate derived front/back
    ───────────────────────────────────────── */

    @Override
    protected FlashcardDTO afterRead(FlashcardDTO dto, Flashcard entity) {
        dto.setFront(extractSideText(entity, SideType.FRONT));
        dto.setBack(extractSideText(entity, SideType.BACK));
        dto.setImageUrl(extractFirstMedia(entity, ContentType.IMAGE));
        dto.setAudioUrl(extractFirstMedia(entity, ContentType.AUDIO));
        return dto;
    }

    /* ─────────────────────────────────────────
       Helpers
    ───────────────────────────────────────── */

    /** Populate legacy front/back columns from FRONT/BACK side text so DB constraint is satisfied. */
    private void syncLegacyFields(Flashcard flashcard, FlashcardDTO request) {
        if (request.getSides() == null) return;
        for (FlashcardDTO.SideDTO side : request.getSides()) {
            if (side.getContents() == null) continue;
            String text = side.getContents().stream()
                    .filter(c -> c.getContentType() == ContentType.TEXT || c.getContentType() == ContentType.CLOZE)
                    .map(FlashcardDTO.ContentDTO::getContentValue)
                    .filter(v -> v != null && !v.isBlank())
                    .findFirst()
                    .orElse("");
            if (side.getSide() == SideType.FRONT) flashcard.setFront(text);
            if (side.getSide() == SideType.BACK)  flashcard.setBack(text);
        }
    }

    /** First non-deleted content value of the given type across any side. */
    private String extractFirstMedia(Flashcard flashcard, ContentType type) {
        if (flashcard.getSides() == null) return null;
        for (FlashcardSide side : flashcard.getSides()) {
            if (side.getContents() == null) continue;
            for (FlashcardSideContent c : side.getContents()) {
                if (Boolean.TRUE.equals(c.getIsDeleted())) continue;
                if (c.getContentType() == type && c.getContentValue() != null && !c.getContentValue().isBlank())
                    return c.getContentValue();
            }
        }
        return null;
    }

    /** Join all non-deleted TEXT/CLOZE values from a side (ordered), separated by newline. */
    private String extractSideText(Flashcard flashcard, SideType sideType) {
        if (flashcard.getSides() == null) return "";
        return flashcard.getSides().stream()
                .filter(s -> sideType == s.getSide())
                .flatMap(s -> s.getContents() == null ? java.util.stream.Stream.empty() : s.getContents().stream())
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .filter(c -> c.getContentType() == ContentType.TEXT || c.getContentType() == ContentType.CLOZE)
                .sorted(java.util.Comparator.comparingInt(FlashcardSideContent::getOrderIndex))
                .map(FlashcardSideContent::getContentValue)
                .filter(v -> v != null && !v.isBlank())
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private List<FlashcardSide> buildSidesFromRequest(Flashcard parent, FlashcardDTO request) {

        List<FlashcardSide> result = new ArrayList<>();
        if (request.getSides() == null) return result;

        for (FlashcardDTO.SideDTO sideDto : request.getSides()) {

            FlashcardSide side = FlashcardSide.builder()
                    .flashcard(parent)
                    .side(sideDto.getSide())
                    .contents(new ArrayList<>())
                    .build();

            if (sideDto.getContents() != null) {
                for (FlashcardDTO.ContentDTO contentDto : sideDto.getContents()) {

                    FlashcardSideContent content = FlashcardSideContent.builder()
                            .side(side)
                            .contentType(contentDto.getContentType())
                            .contentValue(contentDto.getContentValue())
                            .orderIndex(contentDto.getOrderIndex())
                            .metadata(contentDto.getMetadata() != null
                                    ? new HashMap<>(contentDto.getMetadata())
                                    : null)
                            .build();

                    side.getContents().add(content);
                }
            }
            result.add(side);
        }
        return result;
    }
}
