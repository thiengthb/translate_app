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
import java.util.List;
import java.util.Map;

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
        // Mapper ignored sides — build them manually so cascade saves them in the same transaction.
        flashcard.setSides(buildSidesFromRequest(flashcard, request));
    }

    @Override
    protected void beforeUpdate(Flashcard flashcard, FlashcardDTO request, ValidationContext ctx) {
        if (request.getSides() == null) return;

        // orphanRemoval = true → clearing the collection deletes orphaned children at flush time.
        flashcard.getSides().clear();
        flashcard.getSides().addAll(buildSidesFromRequest(flashcard, request));
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
       Helpers
    ───────────────────────────────────────── */

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
