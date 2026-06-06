package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.rbac.permission.Permission;
import com.example.starter_project_2025.system.rbac.permission.PermissionRepository;
import com.example.starter_project_2025.system.rbac.role.Role;
import com.example.starter_project_2025.system.rbac.role.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;

@Slf4j
@Order(2)
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleDataInitializer implements CommandLineRunner {

    private static final String ADMIN_ROLE = "ADMIN";
    private static final String STUDENT_ROLE = "STUDENT";
    private static final String TEACHER_ROLE = "TEACHER";

    RoleRepository roleRepository;
    PermissionRepository permissionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<Permission> allPermissions = permissionRepository.findAll();

        upsertRole(
                ADMIN_ROLE,
                "Administrator with full system access",
                allPermissions
        );

        upsertRole(
                STUDENT_ROLE,
                "Student with read access to decks and full control over personal folders, favorites, and quizlet study",
                findPermissions(
                        "MENU_READ",
                        "TAG_READ", "TAG_CREATE", "TAG_UPDATE", "TAG_DELETE",
                        "DECK_READ", "DECK_CREATE", "DECK_UPDATE", "DECK_DELETE",
                        "DECK_ITEM_READ", "DECK_ITEM_CREATE", "DECK_ITEM_UPDATE", "DECK_ITEM_DELETE",
                        "FLASHCARD_READ", "FLASHCARD_CREATE", "FLASHCARD_UPDATE", "FLASHCARD_DELETE",
                        "FLASHCARD_TEMPLATE_READ", "FLASHCARD_TEMPLATE_CREATE", "FLASHCARD_TEMPLATE_UPDATE", "FLASHCARD_TEMPLATE_DELETE",
                        "FOLDER_CREATE", "FOLDER_READ", "FOLDER_UPDATE", "FOLDER_DELETE",
                        "FAVORITE_DECK_CREATE", "FAVORITE_DECK_READ", "FAVORITE_DECK_DELETE",
                        "QUIZLET_CARD_PROGRESS_READ", "QUIZLET_CARD_PROGRESS_CREATE", "QUIZLET_CARD_PROGRESS_UPDATE", "QUIZLET_CARD_PROGRESS_DELETE",
                        "QUIZLET_STUDY_SESSION_READ", "QUIZLET_STUDY_SESSION_CREATE", "QUIZLET_STUDY_SESSION_UPDATE", "QUIZLET_STUDY_SESSION_DELETE",
                        "QUIZLET_SESSION_ITEM_READ", "QUIZLET_SESSION_ITEM_CREATE", "QUIZLET_SESSION_ITEM_UPDATE", "QUIZLET_SESSION_ITEM_DELETE",
                        "QUIZLET_STUDY_LOG_READ", "QUIZLET_STUDY_LOG_CREATE", "QUIZLET_STUDY_LOG_UPDATE", "QUIZLET_STUDY_LOG_DELETE",
                        "SRS_ALGORITHM_CONFIG_READ",
                        "ANKI_SRS_SETTING_READ", "ANKI_SRS_SETTING_CREATE", "ANKI_SRS_SETTING_UPDATE", "ANKI_SRS_SETTING_DELETE",
                        "ANKI_SRS_PROGRESS_READ", "ANKI_SRS_PROGRESS_CREATE", "ANKI_SRS_PROGRESS_UPDATE", "ANKI_SRS_PROGRESS_DELETE",
                        "ANKI_REVIEW_SESSION_READ", "ANKI_REVIEW_SESSION_CREATE", "ANKI_REVIEW_SESSION_UPDATE", "ANKI_REVIEW_SESSION_DELETE",
                        "ANKI_REVIEW_SESSION_ITEM_READ", "ANKI_REVIEW_SESSION_ITEM_CREATE", "ANKI_REVIEW_SESSION_ITEM_UPDATE", "ANKI_REVIEW_SESSION_ITEM_DELETE",
                        "ANKI_REVIEW_LOG_READ", "ANKI_REVIEW_LOG_CREATE", "ANKI_REVIEW_LOG_UPDATE", "ANKI_REVIEW_LOG_DELETE",
                        // ── Grammar Learning (SRS) module ──
                        "GRAMMAR_PROGRESS_READ", "GRAMMAR_PROGRESS_CREATE", "GRAMMAR_PROGRESS_UPDATE", "GRAMMAR_PROGRESS_DELETE",
                        // ── Assessment module ──
                        "QUIZ_TYPE_READ",
                        "QUIZ_CATEGORY_READ",
                        "QUIZ_READ", "QUIZ_CREATE", "QUIZ_UPDATE", "QUIZ_DELETE",
                        "QUESTION_READ", "QUESTION_CREATE", "QUESTION_UPDATE", "QUESTION_DELETE",
                        "QUESTION_TAG_READ", "QUESTION_TAG_CREATE", "QUESTION_TAG_UPDATE", "QUESTION_TAG_DELETE",
                        "QUIZ_QUESTION_READ", "QUIZ_QUESTION_CREATE", "QUIZ_QUESTION_UPDATE", "QUIZ_QUESTION_DELETE",
                        "QUIZ_ATTEMPT_READ", "QUIZ_ATTEMPT_CREATE", "QUIZ_ATTEMPT_UPDATE", "QUIZ_ATTEMPT_DELETE",
                        "USER_QUIZ_PROGRESS_READ", "USER_QUIZ_PROGRESS_CREATE", "USER_QUIZ_PROGRESS_UPDATE", "USER_QUIZ_PROGRESS_DELETE",
                        // ── Classroom module ──
                        "CLASSROOM_READ", "CLASSROOM_CREATE", "CLASSROOM_UPDATE", "CLASSROOM_DELETE",
                        "CLASS_MEMBER_READ", "CLASS_MEMBER_CREATE", "CLASS_MEMBER_UPDATE", "CLASS_MEMBER_DELETE",
                        "CLASS_DECK_READ", "CLASS_DECK_CREATE", "CLASS_DECK_UPDATE", "CLASS_DECK_DELETE",
                        "CLASS_ASSIGNMENT_READ", "CLASS_ASSIGNMENT_CREATE", "CLASS_ASSIGNMENT_UPDATE", "CLASS_ASSIGNMENT_DELETE"
                )
        );

        upsertRole(
                TEACHER_ROLE,
                "Teacher",
                findPermissions("MENU_READ")
        );

        log.info("Ensured roles and permission mappings: ADMIN, STUDENT, TEACHER.");
    }

    private void upsertRole(String roleName, String description, Collection<Permission> permissions) {
        Role role = roleRepository.findByName(roleName).orElseGet(Role::new);

        role.setName(roleName);
        role.setDescription(description);
        role.setIsActive(true);
        role.setPermissions(new HashSet<>(permissions));

        roleRepository.save(role);
    }

    private List<Permission> findPermissions(String... permissionNames) {
        List<Permission> permissions = new ArrayList<>();

        for (String permissionName : permissionNames) {
            permissionRepository.findByName(permissionName).ifPresent(permissions::add);
        }

        return permissions;
    }
}
