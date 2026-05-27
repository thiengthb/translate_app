package com.example.starter_project_2025.system.rbac.permission;

import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionServiceImpl
        extends BaseCrudServiceImpl<Permission, Long, PermissionDTO, PermissionFilter> {

    PermissionRepository permissionRepository;

    @Override
    protected void beforeCreate(Permission permission, PermissionDTO request, ValidationContext ctx) {
        if (permissionRepository.existsByName(request.getName())) {
            ctx.add("name", "Permission name already exists");
        }
    }

    @Override
    protected void beforeUpdate(Permission permission, PermissionDTO request, ValidationContext ctx) {
        if (request.getName() != null
                && !request.getName().equals(permission.getName())
                && permissionRepository.existsByName(request.getName())) {
            ctx.add("name", "Permission name already exists");
        }
    }
}
