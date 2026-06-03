package com.example.starter_project_2025.domain.kanji_study.deck;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
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
public class KanjiDeckServiceImpl implements KanjiDeckService {

    KanjiDeckRepository kanjiDeckRepository;
    KanjiDeckMapper kanjiDeckMapper;
    UserRepository userRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiDeckDTO> getAll(Pageable pageable, String search, KanjiDeckFilter filter) {

        Specification<KanjiDeck> spec = Specification.where(notDeleted());

        Specification<KanjiDeck> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiDeck> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiDeckRepository.findAll(spec, pageable).map(kanjiDeckMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiDeckDTO getById(Long id) {
        return kanjiDeckRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .map(kanjiDeckMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck not found"));
    }

    @Override
    public KanjiDeckDTO create(KanjiDeckDTO request) {

        KanjiDeck entity = kanjiDeckMapper.toEntity(request);
        entity.setUser(resolveUser(request.getUserId()));
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);
        if (entity.getIsSystem() == null) entity.setIsSystem(false);

        KanjiDeck saved = kanjiDeckRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiDeckMapper.toResponse(saved);
    }

    @Override
    public KanjiDeckDTO update(Long id, KanjiDeckDTO request) {

        KanjiDeck entity = kanjiDeckRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck not found"));

        KanjiDeck beforeSnapshot = cloneForAudit(entity);

        if (request.getUserId() != null
                && (entity.getUser() == null || !request.getUserId().equals(entity.getUser().getId()))) {
            Map<String, List<String>> errors = new LinkedHashMap<>();
            User user = userRepository.findById(request.getUserId()).orElse(null);
            if (user == null) {
                addError(errors, "userId", "User not found");
                throw new BusinessValidationException(errors);
            }
            entity.setUser(user);
        }

        kanjiDeckMapper.update(entity, request);

        KanjiDeck saved = kanjiDeckRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiDeckMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiDeck entity = kanjiDeckRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck not found"));

        entity.setIsDeleted(true);
        KanjiDeck saved = kanjiDeckRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    /** Resolve the owner: explicit userId, else current authenticated user, else null (system deck). */
    private User resolveUser(Long fromRequest) {
        Long userId = fromRequest;
        if (userId == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                userId = up.getId();
            }
        }
        if (userId == null) return null;
        Long resolved = userId;
        return userRepository.findById(resolved)
                .orElseThrow(() -> {
                    Map<String, List<String>> errors = new LinkedHashMap<>();
                    addError(errors, "userId", "User not found");
                    return new BusinessValidationException(errors);
                });
    }

    private Specification<KanjiDeck> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiDeck> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> {
            Predicate title = cb.like(cb.lower(root.get("title")), like);
            Predicate desc = cb.like(cb.lower(root.get("description").as(String.class)), like);
            return cb.or(title, desc);
        };
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiDeck cloneForAudit(KanjiDeck src) {
        KanjiDeck copy = new KanjiDeck();
        copy.setId(src.getId());
        copy.setUser(src.getUser());
        copy.setTitle(src.getTitle());
        copy.setDescription(src.getDescription());
        copy.setVisibility(src.getVisibility());
        copy.setIsSystem(src.getIsSystem());
        copy.setJlptLevel(src.getJlptLevel());
        copy.setCoverImageUrl(src.getCoverImageUrl());
        copy.setTotalKanji(src.getTotalKanji());
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
