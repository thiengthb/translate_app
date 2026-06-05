package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.domain.classroom.deck.ClassDeckDTO;
import com.example.starter_project_2025.domain.classroom.member.ClassMemberDTO;
import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/classrooms")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Classroom", description = "Classroom membership, decks, invite codes")
public class ClassroomController {

    ClassroomService classroomService;

    @GetMapping("/mine")
    public ResponseEntity<List<ClassroomDTO>> myClassrooms(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(classroomService.getMyClassrooms(principal.getId()));
    }

    /** Browse classes anyone can self-join (visibility = PUBLIC). */
    @GetMapping("/public")
    public ResponseEntity<List<ClassroomDTO>> publicClassrooms() {
        return ResponseEntity.ok(classroomService.getPublicClassrooms());
    }

    @PostMapping("/join")
    public ResponseEntity<ClassMemberDTO> join(
            @RequestBody JoinRequest body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(classroomService.joinByInviteCode(principal.getId(), body.getInviteCode()));
    }

    /** Self-join a PUBLIC class by id — no invite code needed. */
    @PostMapping("/{classroomId}/join")
    public ResponseEntity<ClassMemberDTO> joinPublic(
            @PathVariable Long classroomId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(classroomService.joinPublic(principal.getId(), classroomId));
    }

    /** Copy a class into your own classes (like cloning a deck). */
    @PostMapping("/{classroomId}/clone")
    public ResponseEntity<ClassroomDTO> clone(
            @PathVariable Long classroomId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(classroomService.cloneClassroom(classroomId, principal.getId()));
    }

    @PutMapping("/{classroomId}/invite-code/regenerate")
    public ResponseEntity<ClassroomDTO> regenerate(@PathVariable Long classroomId) {
        return ResponseEntity.ok(classroomService.regenerateInviteCode(classroomId));
    }

    @GetMapping("/{classroomId}/members")
    public ResponseEntity<List<ClassMemberDTO>> members(@PathVariable Long classroomId) {
        return ResponseEntity.ok(classroomService.getMembers(classroomId));
    }

    @PostMapping("/{classroomId}/members")
    public ResponseEntity<ClassMemberDTO> addMember(
            @PathVariable Long classroomId,
            @RequestBody MemberRequest body
    ) {
        // Prefer inviting by email; fall back to userId for backward compatibility.
        if (body.getEmail() != null && !body.getEmail().isBlank()) {
            return ResponseEntity.ok(classroomService.addMemberByEmail(classroomId, body.getEmail()));
        }
        return ResponseEntity.ok(classroomService.addMember(classroomId, body.getUserId()));
    }

    @DeleteMapping("/{classroomId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long classroomId, @PathVariable Long userId) {
        classroomService.removeMember(classroomId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{classroomId}/decks")
    public ResponseEntity<List<ClassDeckDTO>> decks(@PathVariable Long classroomId) {
        return ResponseEntity.ok(classroomService.getDecks(classroomId));
    }

    @PostMapping("/{classroomId}/decks")
    public ResponseEntity<ClassDeckDTO> addDeck(
            @PathVariable Long classroomId,
            @RequestBody DeckRequest body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long addedBy = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(classroomService.addDeck(classroomId, body.getDeckId(), addedBy));
    }

    @DeleteMapping("/{classroomId}/decks/{deckId}")
    public ResponseEntity<Void> removeDeck(@PathVariable Long classroomId, @PathVariable Long deckId) {
        classroomService.removeDeck(classroomId, deckId);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class JoinRequest {
        private String inviteCode;
    }

    @Data
    public static class MemberRequest {
        private Long userId;
        private String email;
    }

    @Data
    public static class DeckRequest {
        private Long deckId;
    }
}
