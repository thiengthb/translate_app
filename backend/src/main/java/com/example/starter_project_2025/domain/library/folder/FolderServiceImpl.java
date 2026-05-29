package com.example.starter_project_2025.domain.library.folder;

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

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FolderServiceImpl implements FolderService {

    FolderRepository folderRepository;
    FolderMapper folderMapper;
    UserRepository userRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<FolderDTO> getAll(Pageable pageable, String search, FolderFilter filter) {

        Specification<Folder> spec = Specification.where(notDeleted());

        Specification<Folder> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<Folder> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return folderRepository.findAll(spec, pageable).map(folderMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public FolderDTO getById(Long id) {
        return folderRepository.findById(id)
                .filter(f -> !Boolean.TRUE.equals(f.getIsDeleted()))
                .map(folderMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
    }

    @Override
    public FolderDTO create(FolderDTO request) {

        Long userId = currentUserIdOrFallback(request.getUserId());

        Map<String, List<String>> errors = new LinkedHashMap<>();

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            addError(errors, "userId", "User not found");
            throw new BusinessValidationException(errors);
        }

        if (folderRepository.existsByNameAndUserId(request.getName(), user.getId())) {
            addError(errors, "name", "Folder name already exists for this user");
            throw new BusinessValidationException(errors);
        }

        Folder folder = folderMapper.toEntity(request);
        folder.setUser(user);
        if (folder.getIsActive() == null) folder.setIsActive(true);
        if (folder.getIsDeleted() == null) folder.setIsDeleted(false);

        Folder saved = folderRepository.save(folder);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return folderMapper.toResponse(saved);
    }

    @Override
    public FolderDTO update(Long id, FolderDTO request) {

        Folder folder = folderRepository.findById(id)
                .filter(f -> !Boolean.TRUE.equals(f.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        Folder beforeSnapshot = cloneForAudit(folder);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getUserId() != null && !request.getUserId().equals(folder.getUser().getId())) {
            User user = userRepository.findById(request.getUserId()).orElse(null);
            if (user == null) {
                addError(errors, "userId", "User not found");
                throw new BusinessValidationException(errors);
            }
            folder.setUser(user);
        }

        if (request.getName() != null
                && !request.getName().equals(folder.getName())
                && folderRepository.existsByNameAndUserIdAndIdNot(
                        request.getName(), folder.getUser().getId(), folder.getId())) {
            addError(errors, "name", "Folder name already exists for this user");
            throw new BusinessValidationException(errors);
        }

        folderMapper.update(folder, request);

        Folder saved = folderRepository.save(folder);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return folderMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        Folder folder = folderRepository.findById(id)
                .filter(f -> !Boolean.TRUE.equals(f.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        folder.setIsDeleted(true);
        Folder saved = folderRepository.save(folder);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<Folder> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<Folder> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> {
            Predicate name = cb.like(cb.lower(root.get("name")), like);
            Predicate desc = cb.like(cb.lower(root.get("description").as(String.class)), like);
            return cb.or(name, desc);
        };
    }

    private Long currentUserIdOrFallback(Long fromRequest) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return up.getId();
        }
        return fromRequest;
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new java.util.ArrayList<>()).add(msg);
    }

    private Folder cloneForAudit(Folder src) {
        Folder copy = new Folder();
        copy.setId(src.getId());
        copy.setUser(src.getUser());
        copy.setName(src.getName());
        copy.setDescription(src.getDescription());
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
