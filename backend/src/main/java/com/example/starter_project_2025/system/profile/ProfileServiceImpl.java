package com.example.starter_project_2025.system.profile;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.system.profile.dto.ChangePasswordRequest;
import com.example.starter_project_2025.system.profile.dto.ProfileResponse;
import com.example.starter_project_2025.system.profile.dto.UpdateAvatarRequest;
import com.example.starter_project_2025.system.profile.dto.UpdateProfileRequest;
import com.example.starter_project_2025.system.rbac.role.Role;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProfileServiceImpl implements ProfileService {

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;

    @Override
    public ProfileResponse getProfile(String email) {
        return toResponse(findByEmail(email));
    }

    @Override
    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = findByEmail(email);
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName() != null ? request.lastName().trim() : null);
        user.setPhone(request.phone() != null ? request.phone().trim() : null);
        user.setBio(request.bio() != null ? request.bio().trim() : null);
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("New password and confirm password do not match");
        }

        User user = findByEmail(email);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public ProfileResponse updateAvatar(String email, UpdateAvatarRequest request) {
        User user = findByEmail(email);
        user.setAvatarUrl(request.avatarUrl());
        return toResponse(userRepository.save(user));
    }

    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private ProfileResponse toResponse(User user) {
        Set<String> roles = user.getRoles() == null ? new LinkedHashSet<>() :
                user.getRoles().stream()
                        .map(Role::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .sorted()
                        .collect(Collectors.toCollection(LinkedHashSet::new));

        return new ProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getBio(),
                user.getAvatarUrl(),
                roles,
                user.getCreatedAt()
        );
    }
}
