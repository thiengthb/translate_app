package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import com.example.starter_project_2025.domain.classroom.deck.ClassDeckDTO;
import com.example.starter_project_2025.domain.classroom.member.ClassMemberDTO;

import java.util.List;

public interface ClassroomService extends BaseCrudService<Long, ClassroomDTO, BaseFilter> {

    List<ClassroomDTO> getMyClassrooms(Long userId);

    /** Classes anyone can browse and self-join (visibility = PUBLIC). */
    List<ClassroomDTO> getPublicClassrooms();

    /** Self-join a PUBLIC class by id (rejects PRIVATE classes). */
    ClassMemberDTO joinPublic(Long userId, Long classroomId);

    /** Copy a class into the current user's own classes (like cloning a deck). */
    ClassroomDTO cloneClassroom(Long classroomId, Long userId);

    ClassMemberDTO joinByInviteCode(Long userId, String inviteCode);

    ClassroomDTO regenerateInviteCode(Long classroomId, Long currentUserId);

    List<ClassMemberDTO> getMembers(Long classroomId, Long currentUserId);

    ClassMemberDTO addMember(Long classroomId, Long userId, Long currentUserId);

    ClassMemberDTO addMemberByEmail(Long classroomId, String email, Long currentUserId);

    void removeMember(Long classroomId, Long userId, Long currentUserId);

    List<ClassDeckDTO> getDecks(Long classroomId, Long currentUserId);

    /** {@code addedBy} is the current user; only the classroom owner may add decks. */
    ClassDeckDTO addDeck(Long classroomId, Long deckId, Long addedBy);

    void removeDeck(Long classroomId, Long deckId, Long currentUserId);
}
