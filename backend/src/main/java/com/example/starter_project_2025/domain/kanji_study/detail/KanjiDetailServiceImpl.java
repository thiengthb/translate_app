package com.example.starter_project_2025.domain.kanji_study.detail;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.radical.KanjiRadical;
import com.example.starter_project_2025.domain.kanji_study.radical.KanjiRadicalRepository;
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
public class KanjiDetailServiceImpl implements KanjiDetailService {

    KanjiDetailRepository kanjiDetailRepository;
    KanjiDetailMapper kanjiDetailMapper;
    KanjiRadicalRepository kanjiRadicalRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiDetailDTO> getAll(Pageable pageable, String search, KanjiDetailFilter filter) {

        Specification<KanjiDetail> spec = Specification.where(notDeleted());

        Specification<KanjiDetail> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiDetail> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiDetailRepository.findAll(spec, pageable).map(kanjiDetailMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiDetailDTO> findByComponent(String component, Pageable pageable) {
        return kanjiDetailRepository.findByComponent(component, pageable)
                .map(kanjiDetailMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiDetailDTO getById(Long id) {
        return kanjiDetailRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .map(kanjiDetailMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji not found"));
    }

    @Override
    public KanjiDetailDTO create(KanjiDetailDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (kanjiDetailRepository.existsByCharacter(request.getCharacter())) {
            addError(errors, "character", "Kanji already exists");
            throw new BusinessValidationException(errors);
        }

        KanjiRadical radical = resolveRadical(request.getRadicalId(), errors);
        if (!errors.isEmpty()) throw new BusinessValidationException(errors);

        KanjiDetail entity = kanjiDetailMapper.toEntity(request);
        entity.setRadical(radical);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiDetail saved = kanjiDetailRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiDetailMapper.toResponse(saved);
    }

    @Override
    public KanjiDetailDTO update(Long id, KanjiDetailDTO request) {

        KanjiDetail entity = kanjiDetailRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji not found"));

        KanjiDetail beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getCharacter() != null && !request.getCharacter().equals(entity.getCharacter())
                && kanjiDetailRepository.existsByCharacterAndIdNot(request.getCharacter(), entity.getId())) {
            addError(errors, "character", "Kanji already exists");
            throw new BusinessValidationException(errors);
        }

        if (request.getRadicalId() != null) {
            KanjiRadical radical = resolveRadical(request.getRadicalId(), errors);
            if (!errors.isEmpty()) throw new BusinessValidationException(errors);
            entity.setRadical(radical);
        }

        kanjiDetailMapper.update(entity, request);

        KanjiDetail saved = kanjiDetailRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiDetailMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiDetail entity = kanjiDetailRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji not found"));

        entity.setIsDeleted(true);
        KanjiDetail saved = kanjiDetailRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    /** Resolve an optional radical id; records an error (does not throw) if the id is unknown. */
    private KanjiRadical resolveRadical(Long radicalId, Map<String, List<String>> errors) {
        if (radicalId == null) return null;
        KanjiRadical radical = kanjiRadicalRepository.findById(radicalId).orElse(null);
        if (radical == null) addError(errors, "radicalId", "Radical not found");
        return radical;
    }

    private Specification<KanjiDetail> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiDetail> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        // Kana-folded variants so a hiragana query matches katakana on'yomi and vice versa.
        String likeHira = "%" + kataToHira(keyword.trim()) + "%";
        String likeKata = "%" + hiraToKata(keyword.trim()) + "%";
        return (root, query, cb) -> {
            Predicate ch = cb.like(cb.lower(root.get("character")), like);
            Predicate meaning = cb.like(cb.lower(root.get("meaning").as(String.class)), like);
            Predicate form = cb.like(cb.lower(root.get("formExplanation").as(String.class)), like);
            Predicate onyomi = cb.like(root.get("onyomi").as(String.class), likeKata);
            Predicate kunyomi = cb.like(root.get("kunyomi").as(String.class), likeHira);

            // Hán-Việt match via kanji_readings (e.g. "vị" → 位).
            var sq = query.subquery(Long.class);
            var r = sq.from(com.example.starter_project_2025.domain.kanji_study.reading.KanjiReading.class);
            sq.select(cb.literal(1L)).where(
                    cb.equal(r.get("kanji"), root),
                    cb.equal(r.get("readingType"), "HAN_VIET"),
                    cb.equal(r.get("isDeleted"), false),
                    cb.like(cb.lower(r.get("value")), like));
            Predicate hanViet = cb.exists(sq);

            return cb.or(ch, meaning, form, onyomi, kunyomi, hanViet);
        };
    }

    /** Fold katakana to hiragana (e.g. カン → かん). */
    private static String kataToHira(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) sb.append(c >= 0x30A1 && c <= 0x30F6 ? (char) (c - 0x60) : c);
        return sb.toString();
    }

    /** Fold hiragana to katakana (e.g. かん → カン). */
    private static String hiraToKata(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) sb.append(c >= 0x3041 && c <= 0x3096 ? (char) (c + 0x60) : c);
        return sb.toString();
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiDetail cloneForAudit(KanjiDetail src) {
        KanjiDetail copy = new KanjiDetail();
        copy.setId(src.getId());
        copy.setCharacter(src.getCharacter());
        copy.setOnyomi(src.getOnyomi());
        copy.setKunyomi(src.getKunyomi());
        copy.setMeaning(src.getMeaning());
        copy.setJlptLevel(src.getJlptLevel());
        copy.setRadical(src.getRadical());
        copy.setStrokeCount(src.getStrokeCount());
        copy.setStrokeData(src.getStrokeData());
        copy.setSvgViewbox(src.getSvgViewbox());
        copy.setStrokeSource(src.getStrokeSource());
        copy.setFormExplanation(src.getFormExplanation());
        copy.setEtymology(src.getEtymology());
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
