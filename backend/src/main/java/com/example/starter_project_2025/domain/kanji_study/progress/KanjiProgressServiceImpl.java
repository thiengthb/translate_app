package com.example.starter_project_2025.domain.kanji_study.progress;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.kanji.KanjiRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
public class KanjiProgressServiceImpl implements KanjiProgressService {

    KanjiProgressRepository kanjiProgressRepository;
    KanjiProgressMapper kanjiProgressMapper;
    UserRepository userRepository;
    KanjiRepository kanjiRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiProgressDTO> getAll(Pageable pageable, String search, KanjiProgressFilter filter) {

        Specification<KanjiProgress> spec = Specification.where(notDeleted());

        Specification<KanjiProgress> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        return kanjiProgressRepository.findAll(spec, pageable).map(kanjiProgressMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiProgressDTO getById(Long id) {
        return kanjiProgressRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .map(kanjiProgressMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji progress not found"));
    }

    @Override
    public KanjiProgressDTO create(KanjiProgressDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        User user = resolveUser(request.getUserId());
        if (user == null) addError(errors, "userId", "User not found");

        Kanji kanji = kanjiRepository.findById(request.getKanjiId()).orElse(null);
        if (kanji == null) addError(errors, "kanjiId", "Kanji not found");

        if (!errors.isEmpty()) throw new BusinessValidationException(errors);

        if (kanjiProgressRepository.existsByUserIdAndKanjiId(user.getId(), kanji.getId())) {
            addError(errors, "kanjiId", "Progress already exists for this user and kanji");
            throw new BusinessValidationException(errors);
        }

        KanjiProgress entity = kanjiProgressMapper.toEntity(request);
        entity.setUser(user);
        entity.setKanji(kanji);
        if (entity.getStatus() == null) entity.setStatus("NEW");
        if (entity.getEaseFactor() == null) entity.setEaseFactor(2.5);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiProgress saved = kanjiProgressRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiProgressMapper.toResponse(saved);
    }

    @Override
    public KanjiProgressDTO update(Long id, KanjiProgressDTO request) {

        KanjiProgress entity = kanjiProgressRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji progress not found"));

        KanjiProgress beforeSnapshot = cloneForAudit(entity);

        kanjiProgressMapper.update(entity, request);

        KanjiProgress saved = kanjiProgressRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiProgressMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiProgress entity = kanjiProgressRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji progress not found"));

        entity.setIsDeleted(true);
        KanjiProgress saved = kanjiProgressRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private User resolveUser(Long fromRequest) {
        Long userId = fromRequest;
        if (userId == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                userId = up.getId();
            }
        }
        if (userId == null) return null;
        return userRepository.findById(userId).orElse(null);
    }

    private Specification<KanjiProgress> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiProgress cloneForAudit(KanjiProgress src) {
        KanjiProgress copy = new KanjiProgress();
        copy.setId(src.getId());
        copy.setUser(src.getUser());
        copy.setKanji(src.getKanji());
        copy.setStatus(src.getStatus());
        copy.setCorrectCount(src.getCorrectCount());
        copy.setWrongCount(src.getWrongCount());
        copy.setIntervalDays(src.getIntervalDays());
        copy.setEaseFactor(src.getEaseFactor());
        copy.setNextReviewAt(src.getNextReviewAt());
        copy.setLastStudiedAt(src.getLastStudiedAt());
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
