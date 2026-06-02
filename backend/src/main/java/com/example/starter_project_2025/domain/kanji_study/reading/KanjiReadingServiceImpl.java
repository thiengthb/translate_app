package com.example.starter_project_2025.domain.kanji_study.reading;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
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
public class KanjiReadingServiceImpl implements KanjiReadingService {

    KanjiReadingRepository kanjiReadingRepository;
    KanjiReadingMapper kanjiReadingMapper;
    KanjiRepository kanjiRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiReadingDTO> getAll(Pageable pageable, String search, KanjiReadingFilter filter) {

        Specification<KanjiReading> spec = Specification.where(notDeleted());

        Specification<KanjiReading> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiReading> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiReadingRepository.findAll(spec, pageable).map(kanjiReadingMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiReadingDTO getById(Long id) {
        return kanjiReadingRepository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getIsDeleted()))
                .map(kanjiReadingMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading not found"));
    }

    @Override
    public KanjiReadingDTO create(KanjiReadingDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
        if (kanji == null) {
            addError(errors, "kanjiId", "Kanji not found");
            throw new BusinessValidationException(errors);
        }

        if (kanjiReadingRepository.existsByKanjiIdAndReadingTypeAndValue(
                request.getKanjiId(), request.getReadingType(), request.getValue())) {
            addError(errors, "value", "This reading already exists for the kanji");
            throw new BusinessValidationException(errors);
        }

        KanjiReading entity = kanjiReadingMapper.toEntity(request);
        entity.setKanji(kanji);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiReading saved = kanjiReadingRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiReadingMapper.toResponse(saved);
    }

    @Override
    public KanjiReadingDTO update(Long id, KanjiReadingDTO request) {

        KanjiReading entity = kanjiReadingRepository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading not found"));

        KanjiReading beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getKanjiId() != null && !request.getKanjiId().equals(entity.getKanji().getId())) {
            Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
            if (kanji == null) {
                addError(errors, "kanjiId", "Kanji not found");
                throw new BusinessValidationException(errors);
            }
            entity.setKanji(kanji);
        }

        kanjiReadingMapper.update(entity, request);

        KanjiReading saved = kanjiReadingRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiReadingMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiReading entity = kanjiReadingRepository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading not found"));

        entity.setIsDeleted(true);
        KanjiReading saved = kanjiReadingRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiReading> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiReading> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("value")), like);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiReading cloneForAudit(KanjiReading src) {
        KanjiReading copy = new KanjiReading();
        copy.setId(src.getId());
        copy.setKanji(src.getKanji());
        copy.setReadingType(src.getReadingType());
        copy.setValue(src.getValue());
        copy.setPriority(src.getPriority());
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
