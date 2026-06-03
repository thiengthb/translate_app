package com.example.starter_project_2025.domain.kanji_study.deck_item;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeck;
import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeckRepository;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.kanji.KanjiRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiDeckItemServiceImpl implements KanjiDeckItemService {

    KanjiDeckItemRepository kanjiDeckItemRepository;
    KanjiDeckItemMapper kanjiDeckItemMapper;
    KanjiDeckRepository kanjiDeckRepository;
    KanjiRepository kanjiRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiDeckItemDTO> getAll(Pageable pageable, String search, KanjiDeckItemFilter filter) {

        Specification<KanjiDeckItem> spec = Specification.where(notDeleted());

        Specification<KanjiDeckItem> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        return kanjiDeckItemRepository.findAll(spec, pageable).map(kanjiDeckItemMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiDeckItemDTO getById(Long id) {
        return kanjiDeckItemRepository.findById(id)
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .map(kanjiDeckItemMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck item not found"));
    }

    @Override
    public KanjiDeckItemDTO create(KanjiDeckItemDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        KanjiDeck deck = kanjiDeckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) addError(errors, "deckId", "Kanji deck not found");

        Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
        if (kanji == null) addError(errors, "kanjiId", "Kanji not found");

        if (!errors.isEmpty()) throw new BusinessValidationException(errors);

        if (kanjiDeckItemRepository.existsByDeckIdAndKanjiId(request.getDeckId(), request.getKanjiId())) {
            addError(errors, "kanjiId", "Kanji already in this deck");
            throw new BusinessValidationException(errors);
        }

        KanjiDeckItem entity = kanjiDeckItemMapper.toEntity(request);
        entity.setDeck(deck);
        entity.setKanji(kanji);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiDeckItem saved = kanjiDeckItemRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiDeckItemMapper.toResponse(saved);
    }

    @Override
    public KanjiDeckItemDTO update(Long id, KanjiDeckItemDTO request) {

        KanjiDeckItem entity = kanjiDeckItemRepository.findById(id)
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck item not found"));

        KanjiDeckItem beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getDeckId() != null && !request.getDeckId().equals(entity.getDeck().getId())) {
            KanjiDeck deck = kanjiDeckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) {
                addError(errors, "deckId", "Kanji deck not found");
                throw new BusinessValidationException(errors);
            }
            entity.setDeck(deck);
        }

        if (request.getKanjiId() != null && !request.getKanjiId().equals(entity.getKanji().getId())) {
            Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
            if (kanji == null) {
                addError(errors, "kanjiId", "Kanji not found");
                throw new BusinessValidationException(errors);
            }
            entity.setKanji(kanji);
        }

        if (kanjiDeckItemRepository.existsByDeckIdAndKanjiIdAndIdNot(
                entity.getDeck().getId(), entity.getKanji().getId(), entity.getId())) {
            addError(errors, "kanjiId", "Kanji already in this deck");
            throw new BusinessValidationException(errors);
        }

        kanjiDeckItemMapper.update(entity, request);

        KanjiDeckItem saved = kanjiDeckItemRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiDeckItemMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiDeckItem entity = kanjiDeckItemRepository.findById(id)
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck item not found"));

        entity.setIsDeleted(true);
        KanjiDeckItem saved = kanjiDeckItemRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiDeckItem> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiDeckItem cloneForAudit(KanjiDeckItem src) {
        KanjiDeckItem copy = new KanjiDeckItem();
        copy.setId(src.getId());
        copy.setDeck(src.getDeck());
        copy.setKanji(src.getKanji());
        copy.setOrderIndex(src.getOrderIndex());
        copy.setIsActive(src.getIsActive());
        copy.setIsDeleted(src.getIsDeleted());
        copy.setVersion(src.getVersion());
        copy.setTenantId(src.getTenantId());
        copy.setCreatedAt(src.getCreatedAt());
        copy.setUpdatedAt(src.getUpdatedAt());
        copy.setCreatedBy(src.getCreatedBy());
        copy.setUpdatedBy(src.getUpdatedBy());
        return copy;
    }
}
