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

    ClassroomDTO regenerateInviteCode(Long classroomId);

    List<ClassMemberDTO> getMembers(Long classroomId);

    ClassMemberDTO addMember(Long classroomId, Long userId);

    ClassMemberDTO addMemberByEmail(Long classroomId, String email);

    void removeMember(Long classroomId, Long userId);

    List<ClassDeckDTO> getDecks(Long classroomId);

    ClassDeckDTO addDeck(Long classroomId, Long deckId, Long addedBy);

    void removeDeck(Long classroomId, Long deckId);
}
