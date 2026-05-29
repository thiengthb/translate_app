package com.example.starter_project_2025.system.rbac.user;

import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.system.rbac.role.Role;
import com.example.starter_project_2025.system.rbac.role.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Only business hooks. Repository / mapper / searchable fields are resolved
 * by {@link BaseCrudServiceImpl} via context lookup + {@code @Searchable}.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl
        extends BaseCrudServiceImpl<User, Long, UserDTO, UserFilter> {

    UserRepository userRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;

    @Override
    protected void beforeCreate(User user, UserDTO request, ValidationContext ctx) {
        validateEmailUnique(request.getEmail(), null, ctx);
        validateRoles(request.getRoleIds(), ctx);

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRoles(getRoles(request.getRoleIds()));
    }

    @Override
    protected void beforeUpdate(User user, UserDTO request, ValidationContext ctx) {
        if (request.getEmail() != null) {
            validateEmailUnique(request.getEmail(), user.getId(), ctx);
        }
        if (request.getRoleIds() != null) {
            validateRoles(request.getRoleIds(), ctx);
        }
        if (request.getPassword() != null) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getRoleIds() != null) {
            Set<Role> roles = getRoles(request.getRoleIds());
            user.getRoles().clear();
            user.getRoles().addAll(roles);
        }
    }

    private void validateEmailUnique(String email, Long currentUserId, ValidationContext ctx) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()
                && (currentUserId == null || !existing.get().getId().equals(currentUserId))) {
            ctx.add("email", "Email is already in use");
        }
    }

    private void validateRoles(Set<Long> roleIds, ValidationContext ctx) {
        if (roleIds == null || roleIds.isEmpty()) {
            ctx.add("roleIds", "At least one role must be assigned");
            return;
        }
        long found = roleRepository.countByIdIn(roleIds);
        if (found != roleIds.size()) {
            ctx.add("roleIds", "One or more roles are invalid");
        }
    }

    private Set<Role> getRoles(Set<Long> roleIds) {
        return new HashSet<>(roleRepository.findAllById(roleIds));
    }
}
