package com.example.starter_project_2025.system.menu.module_groups;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ModuleGroupServiceImpl
        extends BaseCrudServiceImpl<ModuleGroup, Long, ModuleGroupDTO, BaseFilter> {

    ModuleGroupRepository moduleGroupRepository;

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
