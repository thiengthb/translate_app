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
import java.util.Arrays;
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

    /**
     * Personal-study (learner) permissions: owning decks/folders/flashcards,
     * SRS / Anki / Quizlet study, and grammar & kanji progress tracking.
     *
     * <p>Shared by STUDENT (full learner) and TEACHER (so a teacher can study
     * on their own — a JP-learning app's teacher is also a learner). It
     * DELIBERATELY EXCLUDES quiz-taking ({@code QUIZ_ATTEMPT_*},
     * {@code USER_QUIZ_PROGRESS_*}): those represent "taking a quiz as a
     * student in a class", which a teacher does not do in classes they own.
     */
    private static final String[] PERSONAL_STUDY_PERMISSIONS = {
            // ── Tags (organising own content) ──
            "TAG_READ", "TAG_CREATE", "TAG_UPDATE", "TAG_DELETE",
            // ── Personal decks / folders / flashcards ──
            "DECK_READ", "DECK_CREATE", "DECK_UPDATE", "DECK_DELETE",
            "DECK_ITEM_READ", "DECK_ITEM_CREATE", "DECK_ITEM_UPDATE", "DECK_ITEM_DELETE",
            "FLASHCARD_READ", "FLASHCARD_CREATE", "FLASHCARD_UPDATE", "FLASHCARD_DELETE",
            "FLASHCARD_TEMPLATE_READ", "FLASHCARD_TEMPLATE_CREATE", "FLASHCARD_TEMPLATE_UPDATE", "FLASHCARD_TEMPLATE_DELETE",
            "FOLDER_CREATE", "FOLDER_READ", "FOLDER_UPDATE", "FOLDER_DELETE",
            "FAVORITE_DECK_CREATE", "FAVORITE_DECK_READ", "FAVORITE_DECK_DELETE",
            // ── Quizlet-style study (cards / sessions / logs) ──
            "QUIZLET_CARD_PROGRESS_READ", "QUIZLET_CARD_PROGRESS_CREATE", "QUIZLET_CARD_PROGRESS_UPDATE", "QUIZLET_CARD_PROGRESS_DELETE",
            "QUIZLET_STUDY_SESSION_READ", "QUIZLET_STUDY_SESSION_CREATE", "QUIZLET_STUDY_SESSION_UPDATE", "QUIZLET_STUDY_SESSION_DELETE",
            "QUIZLET_SESSION_ITEM_READ", "QUIZLET_SESSION_ITEM_CREATE", "QUIZLET_SESSION_ITEM_UPDATE", "QUIZLET_SESSION_ITEM_DELETE",
            "QUIZLET_STUDY_LOG_READ", "QUIZLET_STUDY_LOG_CREATE", "QUIZLET_STUDY_LOG_UPDATE", "QUIZLET_STUDY_LOG_DELETE",
            // ── Anki / SRS study ──
            "SRS_ALGORITHM_CONFIG_READ",
            "ANKI_SRS_SETTING_READ", "ANKI_SRS_SETTING_CREATE", "ANKI_SRS_SETTING_UPDATE", "ANKI_SRS_SETTING_DELETE",
            "ANKI_SRS_PROGRESS_READ", "ANKI_SRS_PROGRESS_CREATE", "ANKI_SRS_PROGRESS_UPDATE", "ANKI_SRS_PROGRESS_DELETE",
            "ANKI_REVIEW_SESSION_READ", "ANKI_REVIEW_SESSION_CREATE", "ANKI_REVIEW_SESSION_UPDATE", "ANKI_REVIEW_SESSION_DELETE",
            "ANKI_REVIEW_SESSION_ITEM_READ", "ANKI_REVIEW_SESSION_ITEM_CREATE", "ANKI_REVIEW_SESSION_ITEM_UPDATE", "ANKI_REVIEW_SESSION_ITEM_DELETE",
            "ANKI_REVIEW_LOG_READ", "ANKI_REVIEW_LOG_CREATE", "ANKI_REVIEW_LOG_UPDATE", "ANKI_REVIEW_LOG_DELETE",
            // ── Grammar learning (SRS) — personal progress ──
            "GRAMMAR_PROGRESS_READ", "GRAMMAR_PROGRESS_CREATE", "GRAMMAR_PROGRESS_UPDATE", "GRAMMAR_PROGRESS_DELETE",
            // ── Kanji study — read content + track own progress ──
            "KANJI_DECK_READ", "KANJI_DETAIL_READ", "KANJI_RADICAL_READ", "KANJI_READING_SET_READ",
            "KANJI_PROGRESS_READ", "KANJI_PROGRESS_CREATE", "KANJI_PROGRESS_UPDATE", "KANJI_PROGRESS_DELETE",
            "KANJI_READING_PROGRESS_READ", "KANJI_READING_PROGRESS_CREATE", "KANJI_READING_PROGRESS_UPDATE", "KANJI_READING_PROGRESS_DELETE",
    };

    /**
     * Quiz-taking permissions: read published quizzes and record one's own
     * attempts / progress. STUDENT-only — the "learner in a class" footprint
     * that we keep OUT of both ADMIN and TEACHER so analytics & audit stay clean.
     */
    private static final String[] QUIZ_TAKING_PERMISSIONS = {
            "QUIZ_TYPE_READ",
            "QUIZ_CATEGORY_READ",
            "QUIZ_READ",
            "QUESTION_READ",
            "QUESTION_TAG_READ",
            "QUIZ_QUESTION_READ",
            "QUIZ_ATTEMPT_READ", "QUIZ_ATTEMPT_CREATE", "QUIZ_ATTEMPT_UPDATE", "QUIZ_ATTEMPT_DELETE",
            "USER_QUIZ_PROGRESS_READ", "USER_QUIZ_PROGRESS_CREATE", "USER_QUIZ_PROGRESS_UPDATE", "USER_QUIZ_PROGRESS_DELETE",
    };

    /** Join & view a class as a learner (no class management). STUDENT-only. */
    private static final String[] CLASSROOM_MEMBER_PERMISSIONS = {
            "CLASSROOM_READ",
            "CLASS_MEMBER_READ", "CLASS_MEMBER_CREATE",
            "CLASS_DECK_READ",
            "CLASS_ASSIGNMENT_READ",
    };

    /**
     * Permission-name prefixes representing a personal "learner footprint"
     * (taking quizzes, Quizlet study, authoring personal flashcards,
     * personal favourites & progress). ADMIN is granted every permission EXCEPT
     * these — an administrator manages the system rather than learning inside
     * it, so their actions don't pollute learning analytics or audit trails. To
     * actually study, sign in with a STUDENT account (the explicit-enrolment
     * model used by Moodle / Docebo).
     *
     * <p>Deliberately KEPT for admin (not listed here):
     * <ul>
     *   <li>{@code SRS_ALGORITHM_CONFIG_*} — system-wide SRS algorithm config,
     *       a management concern.</li>
     *   <li>{@code DECK_*} / {@code FOLDER_*} — so admin can moderate students'
     *       decks/folders.</li>
     *   <li>{@code FLASHCARD_READ} / {@code FLASHCARD_TEMPLATE_READ} — view-only
     *       for moderation; only flashcard create/update/delete is stripped.</li>
     *   <li>{@code ANKI_*} — admin can also use Anki/SRS study personally.</li>
     * </ul>
     */
    private static final String[] ADMIN_EXCLUDED_PREFIXES = {
            "QUIZ_ATTEMPT_",
            "USER_QUIZ_PROGRESS_",
            "QUIZLET_",
            "FAVORITE_DECK_",
            "GRAMMAR_PROGRESS_",
            "KANJI_PROGRESS_",
            "KANJI_READING_PROGRESS_",
            // Flashcards: keep READ (moderation), strip authoring.
            "FLASHCARD_CREATE", "FLASHCARD_UPDATE", "FLASHCARD_DELETE",
            "FLASHCARD_TEMPLATE_CREATE", "FLASHCARD_TEMPLATE_UPDATE", "FLASHCARD_TEMPLATE_DELETE",
    };

    RoleRepository roleRepository;
    PermissionRepository permissionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<Permission> allPermissions = permissionRepository.findAll();

        // ADMIN — full system management, MINUS the personal learner footprint.
        upsertRole(
                ADMIN_ROLE,
                "Administrator — full system management; no personal learning footprint "
                        + "(sign in as a student to study)",
                allExcept(allPermissions, ADMIN_EXCLUDED_PREFIXES)
        );

        // STUDENT — learner: personal study + take quizzes + join classes.
        upsertRole(
                STUDENT_ROLE,
                "Student — learns content, owns personal decks/SRS, takes quizzes and joins classes (no authoring)",
                findPermissions(concat(
                        PERSONAL_STUDY_PERMISSIONS,
                        merge("MENU_READ", QUIZ_TAKING_PERMISSIONS, CLASSROOM_MEMBER_PERMISSIONS)
                ))
        );

        // TEACHER — authoring + classroom management + personal study
        // (deck/anki/quizlet), but NOT quiz-taking in their own classes.
        upsertRole(
                TEACHER_ROLE,
                "Teacher — manages classes, authors quizzes/questions, assigns work; also studies personally (no quiz-taking)",
                findPermissions(concat(
                        PERSONAL_STUDY_PERMISSIONS,
                        new String[]{
                                "MENU_READ",
                                // ── Assessment authoring ──
                                "QUIZ_TYPE_READ", "QUIZ_CATEGORY_READ",
                                "QUIZ_READ", "QUIZ_CREATE", "QUIZ_UPDATE", "QUIZ_DELETE",
                                "QUESTION_READ", "QUESTION_CREATE", "QUESTION_UPDATE", "QUESTION_DELETE",
                                "QUESTION_TAG_READ", "QUESTION_TAG_CREATE", "QUESTION_TAG_UPDATE", "QUESTION_TAG_DELETE",
                                "QUIZ_QUESTION_READ", "QUIZ_QUESTION_CREATE", "QUIZ_QUESTION_UPDATE", "QUIZ_QUESTION_DELETE",
                                // ── See student results (read-only) ──
                                "QUIZ_ATTEMPT_READ",
                                "USER_QUIZ_PROGRESS_READ",
                                // ── Classroom management ──
                                "CLASSROOM_READ", "CLASSROOM_CREATE", "CLASSROOM_UPDATE", "CLASSROOM_DELETE",
                                "CLASS_MEMBER_READ", "CLASS_MEMBER_CREATE", "CLASS_MEMBER_UPDATE", "CLASS_MEMBER_DELETE",
                                "CLASS_DECK_READ", "CLASS_DECK_CREATE", "CLASS_DECK_UPDATE", "CLASS_DECK_DELETE",
                                "CLASS_ASSIGNMENT_READ", "CLASS_ASSIGNMENT_CREATE", "CLASS_ASSIGNMENT_UPDATE", "CLASS_ASSIGNMENT_DELETE",
                        }
                ))
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

    /** Every permission whose name does NOT start with one of the given prefixes. */
    private List<Permission> allExcept(List<Permission> all, String... excludedPrefixes) {
        return all.stream()
                .filter(p -> Arrays.stream(excludedPrefixes)
                        .noneMatch(prefix -> p.getName().startsWith(prefix)))
                .toList();
    }

    private List<Permission> findPermissions(String... permissionNames) {
        List<Permission> permissions = new ArrayList<>();

        for (String permissionName : permissionNames) {
            permissionRepository.findByName(permissionName).ifPresent(permissions::add);
        }

        return permissions;
    }

    /** Concatenate a base permission-name array with extra names. */
    private static String[] concat(String[] base, String... extra) {
        String[] out = Arrays.copyOf(base, base.length + extra.length);
        System.arraycopy(extra, 0, out, base.length, extra.length);
        return out;
    }

    /** Flatten a leading single name plus any number of name arrays into one array. */
    private static String[] merge(String first, String[]... groups) {
        List<String> out = new ArrayList<>();
        out.add(first);
        for (String[] group : groups) {
            out.addAll(Arrays.asList(group));
        }
        return out.toArray(new String[0]);
    }
}
