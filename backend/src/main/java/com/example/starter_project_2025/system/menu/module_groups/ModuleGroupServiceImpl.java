package com.example.starter_project_2025.system.menu.module_groups;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.base.i18n.I18nResolver;
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
public class ModuleGroupServiceImpl
        extends BaseCrudServiceImpl<ModuleGroup, Long, ModuleGroupDTO, BaseFilter> {

    ModuleGroupRepository moduleGroupRepository;
    I18nResolver i18nResolver;

    @Override
    @Transactional(readOnly = true)
    public ModuleGroupDTO getById(Long id) {
        return localise(super.getById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ModuleGroupDTO> getAll(Pageable pageable, String search, BaseFilter filter) {
        Page<ModuleGroupDTO> page = super.getAll(pageable, search, filter);
        page.forEach(this::localise);
        return page;
    }

    private ModuleGroupDTO localise(ModuleGroupDTO dto) {
        if (dto == null) return null;
        if (dto.getName() != null) {
            String key = "moduleGroup." + dto.getName() + ".name";
            dto.setName(i18nResolver.resolve(key, dto.getName()));
        }
        return dto;
    }

    @Override
    protected void beforeCreate(ModuleGroup entity, ModuleGroupDTO dto, ValidationContext ctx) {
        if (moduleGroupRepository.existsByNameIgnoreCase(dto.getName())) {
            ctx.add("name", "Module group name already exists");
        }
    }

    @Override
    protected void beforeUpdate(ModuleGroup entity, ModuleGroupDTO dto, ValidationContext ctx) {
        if (dto.getName() != null
                && !dto.getName().equalsIgnoreCase(entity.getName())
                && moduleGroupRepository.existsByNameIgnoreCase(dto.getName())) {
            ctx.add("name", "Module group name already exists");
        }
    }
}
