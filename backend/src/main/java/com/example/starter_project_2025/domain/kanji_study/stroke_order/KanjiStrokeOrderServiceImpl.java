package com.example.starter_project_2025.domain.kanji_study.stroke_order;

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
public class KanjiStrokeOrderServiceImpl implements KanjiStrokeOrderService {

    KanjiStrokeOrderRepository kanjiStrokeOrderRepository;
    KanjiStrokeOrderMapper kanjiStrokeOrderMapper;
    KanjiRepository kanjiRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiStrokeOrderDTO> getAll(Pageable pageable, String search, KanjiStrokeOrderFilter filter) {

        Specification<KanjiStrokeOrder> spec = Specification.where(notDeleted());

        Specification<KanjiStrokeOrder> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiStrokeOrder> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiStrokeOrderRepository.findAll(spec, pageable).map(kanjiStrokeOrderMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiStrokeOrderDTO getById(Long id) {
        return kanjiStrokeOrderRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .map(kanjiStrokeOrderMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji stroke order not found"));
    }

    @Override
    public KanjiStrokeOrderDTO create(KanjiStrokeOrderDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
        if (kanji == null) {
            addError(errors, "kanjiId", "Kanji not found");
            throw new BusinessValidationException(errors);
        }

        if (kanjiStrokeOrderRepository.existsByKanjiId(request.getKanjiId())) {
            addError(errors, "kanjiId", "Stroke order already exists for this kanji");
            throw new BusinessValidationException(errors);
        }

        KanjiStrokeOrder entity = kanjiStrokeOrderMapper.toEntity(request);
        entity.setKanji(kanji);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiStrokeOrder saved = kanjiStrokeOrderRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiStrokeOrderMapper.toResponse(saved);
    }

    @Override
    public KanjiStrokeOrderDTO update(Long id, KanjiStrokeOrderDTO request) {

        KanjiStrokeOrder entity = kanjiStrokeOrderRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji stroke order not found"));

        KanjiStrokeOrder beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getKanjiId() != null && !request.getKanjiId().equals(entity.getKanji().getId())) {
            Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
            if (kanji == null) {
                addError(errors, "kanjiId", "Kanji not found");
                throw new BusinessValidationException(errors);
            }
            if (kanjiStrokeOrderRepository.existsByKanjiIdAndIdNot(request.getKanjiId(), entity.getId())) {
                addError(errors, "kanjiId", "Stroke order already exists for this kanji");
                throw new BusinessValidationException(errors);
            }
            entity.setKanji(kanji);
        }

        kanjiStrokeOrderMapper.update(entity, request);

        KanjiStrokeOrder saved = kanjiStrokeOrderRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiStrokeOrderMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiStrokeOrder entity = kanjiStrokeOrderRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji stroke order not found"));

        entity.setIsDeleted(true);
        KanjiStrokeOrder saved = kanjiStrokeOrderRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiStrokeOrder> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiStrokeOrder> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("source")), like);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiStrokeOrder cloneForAudit(KanjiStrokeOrder src) {
        KanjiStrokeOrder copy = new KanjiStrokeOrder();
        copy.setId(src.getId());
        copy.setKanji(src.getKanji());
        copy.setStrokeCount(src.getStrokeCount());
        copy.setStrokeData(src.getStrokeData());
        copy.setSvgViewbox(src.getSvgViewbox());
        copy.setSource(src.getSource());
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
