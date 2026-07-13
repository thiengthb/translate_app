package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.classroom.deck.ClassDeck;
import com.example.starter_project_2025.domain.classroom.deck.ClassDeckDTO;
import com.example.starter_project_2025.domain.classroom.deck.ClassDeckRepository;
import com.example.starter_project_2025.domain.classroom.member.ClassMember;
import com.example.starter_project_2025.domain.classroom.member.ClassMemberDTO;
import com.example.starter_project_2025.domain.classroom.member.ClassMemberRepository;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassroomServiceImpl
        extends BaseCrudServiceImpl<Classroom, Long, ClassroomDTO, BaseFilter>
        implements ClassroomService {

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    ClassroomMapper classroomMapper;
    ClassroomRepository classroomRepository;
    ClassMemberRepository memberRepository;
    ClassDeckRepository deckLinkRepository;
    DeckRepository deckRepository;
    UserRepository userRepository;

    @Override
    protected BaseCrudRepository<Classroom, Long> getRepository() {
        return classroomRepository;
    }

    @Override
    protected BaseCrudMapper<Classroom, ClassroomDTO> getMapper() {
        return classroomMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "description"};
    }

    /* ── Lifecycle ── */

    @Override
    protected void beforeCreate(Classroom entity, ClassroomDTO request, ValidationContext ctx) {
        Long ownerId = getCurrentUserId() != null ? getCurrentUserId() : request.getOwnerId();
        if (ownerId == null) {
            ctx.add("ownerId", "Owner could not be resolved");
            return;
        }
        entity.setOwnerId(ownerId);
        if (entity.getInviteCode() == null || entity.getInviteCode().isBlank()) {
            entity.setInviteCode(generateInviteCode());
        }
        // The mapper may have overwritten the entity default with a null from the
        // request — normalise to a valid visibility (column is NOT NULL).
        entity.setVisibility(normalizeVisibility(entity.getVisibility()));
    }

    @Override
    protected void beforeUpdate(Classroom entity, ClassroomDTO request, ValidationContext ctx) {
        if (request.getVisibility() != null) {
            entity.setVisibility(normalizeVisibility(request.getVisibility()));
        }
    }

    private static String normalizeVisibility(String v) {
        return "PUBLIC".equalsIgnoreCase(v) ? "PUBLIC" : "PRIVATE";
    }

    @Override
    protected ClassroomDTO afterRead(ClassroomDTO dto, Classroom entity) {
        dto.setMemberCount((int) memberRepository.countByClassroomIdAndIsActiveTrue(entity.getId()));
        return dto;
    }

    /* ── Public classes (browse + self-join) ── */

    @Override
    @Transactional(readOnly = true)
    public List<ClassroomDTO> getPublicClassrooms() {
        List<ClassroomDTO> result = new ArrayList<>();
        for (Classroom c : classroomRepository.findByVisibilityAndIsDeletedFalseOrderByCreatedAtDesc("PUBLIC")) {
            result.add(enrich(c));
        }
        return result;
    }

    @Override
    public ClassMemberDTO joinPublic(Long userId, Long classroomId) {
        Classroom classroom = load(classroomId);
        if (Boolean.TRUE.equals(classroom.getIsDeleted())) {
            throw new ResourceNotFoundException("Classroom not found");
        }
        if (!"PUBLIC".equalsIgnoreCase(classroom.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This class is private — join with an invite code");
        }
        // Lock the classroom row so concurrent joins serialise on it — the
        // capacity check below and the insert are then effectively atomic.
        Classroom locked = classroomRepository.findByIdForUpdate(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found"));
        // Block re-joining a class the user is already an active member of.
        memberRepository.findByClassroomIdAndUserId(classroomId, userId).ifPresent(m -> {
            if (Boolean.TRUE.equals(m.getIsActive())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already a member of this group");
            }
        });
        assertNotFull(locked);
        // Self-join: the joining user is (intentionally) not the owner, so bypass
        // the owner check and add the membership directly.
        return doAddMember(classroomId, userId);
    }

    /* ── Clone a class into the current user's own classes ── */

    @Override
    public ClassroomDTO cloneClassroom(Long classroomId, Long userId) {
        Classroom source = load(classroomId);

        Classroom copy = Classroom.builder()
                .ownerId(userId)
                .name(source.getName() + " (Copy)")
                .description(source.getDescription())
                .coverImageUrl(source.getCoverImageUrl())
                .maxMembers(source.getMaxMembers())
                .visibility("PRIVATE")
                .inviteCode(generateInviteCode())
                .build();
        Classroom saved = classroomRepository.save(copy);

        // Copy the deck links (shared deck references); members are NOT copied.
        for (ClassDeck cd : deckLinkRepository.findByClassroomIdAndIsActiveTrue(classroomId)) {
            deckLinkRepository.save(ClassDeck.builder()
                    .classroomId(saved.getId())
                    .deckId(cd.getDeckId())
                    .addedBy(userId)
                    .addedAt(LocalDateTime.now())
                    .build());
        }
        return enrich(saved);
    }

    /* ── My classrooms (owner + joined) ── */

    @Override
    @Transactional(readOnly = true)
    public List<ClassroomDTO> getMyClassrooms(Long userId) {
        Map<Long, ClassroomDTO> byId = new LinkedHashMap<>();

        for (Classroom c : classroomRepository.findByOwnerIdAndIsDeletedFalse(userId)) {
            byId.put(c.getId(), enrich(c));
        }
        for (ClassMember m : memberRepository.findByUserIdAndIsActiveTrue(userId)) {
            if (byId.containsKey(m.getClassroomId())) continue;
            classroomRepository.findById(m.getClassroomId())
                    .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                    .ifPresent(c -> byId.put(c.getId(), enrich(c)));
        }
        return new ArrayList<>(byId.values());
    }

    /* ── Join by invite code ── */

    @Override
    public ClassMemberDTO joinByInviteCode(Long userId, String inviteCode) {
        Classroom found = classroomRepository.findByInviteCode(inviteCode == null ? "" : inviteCode.trim().toUpperCase())
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite code"));

        // Lock the classroom row so concurrent joins serialise on it — the
        // capacity check and the insert below are then effectively atomic.
        Classroom classroom = classroomRepository.findByIdForUpdate(found.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite code"));

        if (memberRepository.existsByClassroomIdAndUserId(classroom.getId(), userId)) {
            ClassMember existing = memberRepository.findByClassroomIdAndUserId(classroom.getId(), userId).orElseThrow();
            // Already an active member → reject the re-join instead of silently
            // succeeding. A membership row that was deactivated (the user left
            // earlier) is reactivated, which is a legitimate "re-join".
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already a member of this group");
            }
            // Reactivation still adds an active member — enforce capacity here too.
            assertNotFull(classroom);
            existing.setIsActive(true);
            existing.setJoinedAt(LocalDateTime.now());
            return toMemberDto(memberRepository.save(existing));
        }

        assertNotFull(classroom);

        ClassMember member = ClassMember.builder()
                .classroomId(classroom.getId())
                .userId(userId)
                .role("STUDENT")
                .joinedVia("INVITE_CODE")
                .joinedAt(LocalDateTime.now())
                .build();
        return toMemberDto(memberRepository.save(member));
    }

    /* ── Invite code ── */

    @Override
    public ClassroomDTO regenerateInviteCode(Long classroomId, Long currentUserId) {
        assertClassroomOwner(classroomId, currentUserId);
        Classroom classroom = load(classroomId);
        classroom.setInviteCode(generateInviteCode());
        return enrich(classroomRepository.save(classroom));
    }

    /* ── Members ── */

    @Override
    @Transactional(readOnly = true)
    public List<ClassMemberDTO> getMembers(Long classroomId, Long currentUserId) {
        // Member roster carries PII (names + avatars) — restrict to the owner and
        // active members of the class.
        assertClassroomOwnerOrMember(classroomId, currentUserId);
        List<ClassMember> members = memberRepository.findByClassroomIdAndIsActiveTrue(classroomId);

        // Batch-load member users in one query instead of one findById per row.
        List<Long> userIds = members.stream().map(ClassMember::getUserId).distinct().toList();
        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        List<ClassMemberDTO> result = new ArrayList<>();
        for (ClassMember m : members) {
            result.add(toMemberDto(m, usersById.get(m.getUserId())));
        }
        return result;
    }

    @Override
    public ClassMemberDTO addMember(Long classroomId, Long userId, Long currentUserId) {
        assertClassroomOwner(classroomId, currentUserId);
        return doAddMember(classroomId, userId);
    }

    /** Add (or reactivate) a membership — no ownership check; callers must gate it. */
    private ClassMemberDTO doAddMember(Long classroomId, Long userId) {
        load(classroomId);
        if (memberRepository.existsByClassroomIdAndUserId(classroomId, userId)) {
            ClassMember existing = memberRepository.findByClassroomIdAndUserId(classroomId, userId).orElseThrow();
            existing.setIsActive(true);
            return toMemberDto(memberRepository.save(existing));
        }
        ClassMember member = ClassMember.builder()
                .classroomId(classroomId)
                .userId(userId)
                .role("STUDENT")
                .joinedVia("MANUAL")
                .joinedAt(LocalDateTime.now())
                .build();
        return toMemberDto(memberRepository.save(member));
    }

    @Override
    public ClassMemberDTO addMemberByEmail(Long classroomId, String email, Long currentUserId) {
        assertClassroomOwner(classroomId, currentUserId);
        String normalized = email == null ? "" : email.trim();
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        User user = userRepository.findByEmail(normalized)
                .or(() -> userRepository.findByEmail(normalized.toLowerCase()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No user found with email " + normalized));
        return doAddMember(classroomId, user.getId());
    }

    @Override
    public void removeMember(Long classroomId, Long userId, Long currentUserId) {
        // The owner may remove anyone; a member may remove only themselves (leave).
        if (currentUserId == null || !currentUserId.equals(userId)) {
            assertClassroomOwner(classroomId, currentUserId);
        }
        memberRepository.findByClassroomIdAndUserId(classroomId, userId).ifPresent(m -> {
            m.setIsActive(false);
            memberRepository.save(m);
        });
    }

    /* ── Decks ── */

    @Override
    @Transactional(readOnly = true)
    public List<ClassDeckDTO> getDecks(Long classroomId, Long currentUserId) {
        // Deck list is class content — restrict to the owner and active members.
        assertClassroomOwnerOrMember(classroomId, currentUserId);
        List<ClassDeck> links = deckLinkRepository.findByClassroomIdAndIsActiveTrue(classroomId);

        // Batch-load the linked decks in one query instead of one findById per row.
        List<Long> deckIds = links.stream().map(ClassDeck::getDeckId).distinct().toList();
        Map<Long, Deck> decksById = deckRepository.findAllById(deckIds).stream()
                .collect(java.util.stream.Collectors.toMap(Deck::getId, d -> d));

        List<ClassDeckDTO> result = new ArrayList<>();
        for (ClassDeck cd : links) {
            result.add(toDeckDto(cd, decksById.get(cd.getDeckId())));
        }
        return result;
    }

    @Override
    public ClassDeckDTO addDeck(Long classroomId, Long deckId, Long addedBy) {
        // addedBy is the current user (passed from @AuthenticationPrincipal).
        assertClassroomOwner(classroomId, addedBy);
        load(classroomId);
        if (deckLinkRepository.existsByClassroomIdAndDeckId(classroomId, deckId)) {
            ClassDeck existing = deckLinkRepository.findByClassroomIdAndDeckId(classroomId, deckId).orElseThrow();
            existing.setIsActive(true);
            return toDeckDto(deckLinkRepository.save(existing));
        }
        ClassDeck link = ClassDeck.builder()
                .classroomId(classroomId)
                .deckId(deckId)
                .addedBy(addedBy)
                .addedAt(LocalDateTime.now())
                .build();
        return toDeckDto(deckLinkRepository.save(link));
    }

    @Override
    public void removeDeck(Long classroomId, Long deckId, Long currentUserId) {
        assertClassroomOwner(classroomId, currentUserId);
        deckLinkRepository.findByClassroomIdAndDeckId(classroomId, deckId).ifPresent(cd -> {
            cd.setIsActive(false);
            deckLinkRepository.save(cd);
        });
    }

    /* ── Helpers ── */

    private Classroom load(Long classroomId) {
        return classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found"));
    }

    /**
     * Reject with 409 when adding one more active member would exceed
     * {@code maxMembers}. Call while holding the classroom row lock so the
     * count-then-insert stays atomic under concurrent joins.
     */
    private void assertNotFull(Classroom classroom) {
        if (classroom.getMaxMembers() != null
                && memberRepository.countByClassroomIdAndIsActiveTrue(classroom.getId()) >= classroom.getMaxMembers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Classroom is full");
        }
    }

    /** Reject the call with 403 unless {@code currentUserId} owns the classroom. */
    private void assertClassroomOwner(Long classroomId, Long currentUserId) {
        Classroom classroom = load(classroomId);
        if (currentUserId == null || !currentUserId.equals(classroom.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the owner of this classroom");
        }
    }

    /** Allow the owner or any active member; reject everyone else with 403. */
    private void assertClassroomOwnerOrMember(Long classroomId, Long currentUserId) {
        Classroom classroom = load(classroomId);
        if (currentUserId != null && currentUserId.equals(classroom.getOwnerId())) {
            return;
        }
        boolean activeMember = currentUserId != null
                && memberRepository.findByClassroomIdAndUserId(classroomId, currentUserId)
                        .map(m -> Boolean.TRUE.equals(m.getIsActive()))
                        .orElse(false);
        if (!activeMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this classroom");
        }
    }

    private ClassroomDTO enrich(Classroom c) {
        ClassroomDTO dto = classroomMapper.toResponse(c);
        dto.setMemberCount((int) memberRepository.countByClassroomIdAndIsActiveTrue(c.getId()));
        return dto;
    }

    /** Single-item convenience: loads the member's user itself. */
    private ClassMemberDTO toMemberDto(ClassMember m) {
        return toMemberDto(m, userRepository.findById(m.getUserId()).orElse(null));
    }

    /** Batch-friendly: caller supplies the already-loaded user (may be null). */
    private ClassMemberDTO toMemberDto(ClassMember m, User user) {
        ClassMemberDTO dto = ClassMemberDTO.builder()
                .classroomId(m.getClassroomId())
                .userId(m.getUserId())
                .role(m.getRole())
                .joinedVia(m.getJoinedVia())
                .joinedAt(m.getJoinedAt())
                .build();
        dto.setId(m.getId());
        dto.setIsActive(m.getIsActive());
        if (user != null) {
            dto.setDisplayName(user.getFullName());
            dto.setAvatarUrl(user.getAvatarUrl());
        }
        return dto;
    }

    /** Single-item convenience: loads the linked deck itself. */
    private ClassDeckDTO toDeckDto(ClassDeck cd) {
        return toDeckDto(cd, deckRepository.findById(cd.getDeckId()).orElse(null));
    }

    /** Batch-friendly: caller supplies the already-loaded deck (may be null). */
    private ClassDeckDTO toDeckDto(ClassDeck cd, Deck deck) {
        ClassDeckDTO dto = ClassDeckDTO.builder()
                .classroomId(cd.getClassroomId())
                .deckId(cd.getDeckId())
                .addedBy(cd.getAddedBy())
                .addedAt(cd.getAddedAt())
                .build();
        dto.setId(cd.getId());
        dto.setIsActive(cd.getIsActive());
        if (deck != null) dto.setDeckTitle(deck.getTitle());
        return dto;
    }

    private String generateInviteCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS.charAt((int) (Math.random() * CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (classroomRepository.existsByInviteCode(code));
        return code;
    }
}
