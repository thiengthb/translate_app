package com.example.starter_project_2025.domain.kanji_study.radical;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiRadicalServiceImpl implements KanjiRadicalService {

    KanjiRadicalRepository kanjiRadicalRepository;
    KanjiRadicalMapper kanjiRadicalMapper;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiRadicalDTO> getAll(Pageable pageable, String search, KanjiRadicalFilter filter) {

        Specification<KanjiRadical> spec = Specification.where(notDeleted());

        Specification<KanjiRadical> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiRadical> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiRadicalRepository.findAll(spec, pageable).map(kanjiRadicalMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiRadicalDTO getById(Long id) {
        return kanjiRadicalRepository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getIsDeleted()))
                .map(kanjiRadicalMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji radical not found"));
    }

    @Override
    public KanjiRadicalDTO create(KanjiRadicalDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getNumber() != null && kanjiRadicalRepository.existsByNumber(request.getNumber())) {
            addError(errors, "number", "Radical number already exists");
            throw new BusinessValidationException(errors);
        }

        KanjiRadical entity = kanjiRadicalMapper.toEntity(request);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiRadical saved = kanjiRadicalRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiRadicalMapper.toResponse(saved);
    }

    @Override
    public KanjiRadicalDTO update(Long id, KanjiRadicalDTO request) {

        KanjiRadical entity = kanjiRadicalRepository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji radical not found"));

        KanjiRadical beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getNumber() != null && !request.getNumber().equals(entity.getNumber())
                && kanjiRadicalRepository.existsByNumberAndIdNot(request.getNumber(), entity.getId())) {
            addError(errors, "number", "Radical number already exists");
            throw new BusinessValidationException(errors);
        }

        kanjiRadicalMapper.update(entity, request);

        KanjiRadical saved = kanjiRadicalRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiRadicalMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiRadical entity = kanjiRadicalRepository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji radical not found"));

        entity.setIsDeleted(true);
        KanjiRadical saved = kanjiRadicalRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiRadical> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiRadical> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> {
            Predicate ch = cb.like(cb.lower(root.get("character")), like);
            Predicate hv = cb.like(cb.lower(root.get("hanViet").as(String.class)), like);
            Predicate mn = cb.like(cb.lower(root.get("meaning").as(String.class)), like);
            return cb.or(ch, hv, mn);
        };
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiRadical cloneForAudit(KanjiRadical src) {
        KanjiRadical copy = new KanjiRadical();
        copy.setId(src.getId());
        copy.setNumber(src.getNumber());
        copy.setCharacter(src.getCharacter());
        copy.setHanViet(src.getHanViet());
        copy.setMeaning(src.getMeaning());
        copy.setStrokeCount(src.getStrokeCount());
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
