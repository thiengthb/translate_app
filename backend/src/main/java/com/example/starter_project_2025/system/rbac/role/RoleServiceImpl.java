package com.example.starter_project_2025.system.rbac.role;

import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.system.rbac.permission.Permission;
import com.example.starter_project_2025.system.rbac.permission.PermissionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleServiceImpl
        extends BaseCrudServiceImpl<Role, Long, RoleDTO, RoleFilter> {

    RoleRepository roleRepository;
    PermissionRepository permissionRepository;

    @Override
    protected void beforeCreate(Role role, RoleDTO request, ValidationContext ctx) {
        validateRoleNameUnique(request.getName(), null, ctx);
        validatePermissions(request.getPermissionIds(), ctx);
        assignPermissions(role, request.getPermissionIds());
    }

    @Override
    protected void beforeUpdate(Role role, RoleDTO request, ValidationContext ctx) {
        if (request.getName() != null) {
            validateRoleNameUnique(request.getName(), role.getId(), ctx);
        }
        if (request.getPermissionIds() != null) {
            validatePermissions(request.getPermissionIds(), ctx);
            assignPermissions(role, request.getPermissionIds());
        }
    }

    private void validateRoleNameUnique(String name, Long currentId, ValidationContext ctx) {
        Optional<Role> existing = roleRepository.findByName(name);
        if (existing.isPresent()
                && (currentId == null || !existing.get().getId().equals(currentId))) {
            ctx.add("name", "Role name already exists");
        }
    }

    private void validatePermissions(Set<Long> permissionIds, ValidationContext ctx) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            ctx.add("permissionIds", "At least one permission must be assigned");
            return;
        }
        long found = permissionRepository.countByIdIn(permissionIds);
        if (found != permissionIds.size()) {
            ctx.add("permissionIds", "One or more permissions are invalid");
        }
    }

    private void assignPermissions(Role role, Set<Long> permissionIds) {
        Set<Permission> permissions = new HashSet<>(permissionRepository.findAllById(permissionIds));
        role.getPermissions().clear();
        role.getPermissions().addAll(permissions);
    }
}
