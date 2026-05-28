package com.example.starter_project_2025.system.menu.module;

import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.base.i18n.I18nResolver;
import com.example.starter_project_2025.system.menu.module_groups.ModuleGroup;
import com.example.starter_project_2025.system.menu.module_groups.ModuleGroupRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ModuleServiceImpl
        extends BaseCrudServiceImpl<Module, Long, ModuleDTO, ModuleFilter> {

    ModuleRepository moduleRepository;
    ModuleGroupRepository moduleGroupRepository;
    I18nResolver i18nResolver;

    @Override
    @Transactional(readOnly = true)
    public ModuleDTO getById(Long id) {
        return localise(super.getById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ModuleDTO> getAll(Pageable pageable, String search, ModuleFilter filter) {
        Page<ModuleDTO> page = super.getAll(pageable, search, filter);
        page.forEach(this::localise);
        return page;
    }

    /**
     * Apply the current-request locale to display fields. Falls back to the
     * stored value if no translation row exists (see Translation entity).
     */
    private ModuleDTO localise(ModuleDTO dto) {
        if (dto == null) return null;
        if (dto.getUrl() != null) {
            String key = "module." + dto.getUrl() + ".title";
            dto.setTitle(i18nResolver.resolve(key, dto.getTitle()));
        }
        return dto;
    }

    @Override
    protected void beforeCreate(Module module, ModuleDTO dto, ValidationContext ctx) {
        ModuleGroup group = resolveModuleGroup(dto.getModuleGroupId(), ctx);

        if (dto.getUrl() != null && moduleRepository.existsByUrl(dto.getUrl())) {
            ctx.add("url", "Module URL already exists");
        }
        if (dto.getModuleGroupId() != null && dto.getTitle() != null
                && moduleRepository.existsByModuleGroupIdAndTitle(dto.getModuleGroupId(), dto.getTitle())) {
            ctx.add("title", "Module title already exists in this group");
        }

        if (group != null) {
            module.setModuleGroup(group);
        }
    }

    @Override
    protected void beforeUpdate(Module module, ModuleDTO dto, ValidationContext ctx) {
        Long currentGroupId = module.getModuleGroup() != null ? module.getModuleGroup().getId() : null;
        Long targetGroupId = dto.getModuleGroupId() != null ? dto.getModuleGroupId() : currentGroupId;
        String targetTitle = dto.getTitle() != null ? dto.getTitle() : module.getTitle();

        if (dto.getModuleGroupId() != null) {
            ModuleGroup group = resolveModuleGroup(dto.getModuleGroupId(), ctx);
            if (group != null) {
                module.setModuleGroup(group);
            }
        }

        if (dto.getUrl() != null
                && !dto.getUrl().equals(module.getUrl())
                && moduleRepository.existsByUrlAndIdNot(dto.getUrl(), module.getId())) {
            ctx.add("url", "Module URL already exists");
        }

        boolean titleChanged = dto.getTitle() != null && !dto.getTitle().equals(module.getTitle());
        boolean groupChanged = dto.getModuleGroupId() != null && !dto.getModuleGroupId().equals(currentGroupId);

        if ((titleChanged || groupChanged)
                && targetGroupId != null && targetTitle != null
                && moduleRepository.existsByModuleGroupIdAndTitle(targetGroupId, targetTitle)) {
            ctx.add("title", "Module title already exists in this group");
        }
    }

    private ModuleGroup resolveModuleGroup(Long moduleGroupId, ValidationContext ctx) {
        if (moduleGroupId == null) {
            ctx.add("moduleGroupId", "Module group id is required");
            return null;
        }
        ModuleGroup group = moduleGroupRepository.findById(moduleGroupId).orElse(null);
        if (group == null) {
            ctx.add("moduleGroupId", "Module group does not exist");
        }
        return group;
    }
}
