package com.example.starter_project_2025.domain.classroom.deck;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassDeckRepository extends BaseCrudRepository<ClassDeck, Long> {

    List<ClassDeck> findByClassroomIdAndIsActiveTrue(Long classroomId);

    Optional<ClassDeck> findByClassroomIdAndDeckId(Long classroomId, Long deckId);

    boolean existsByClassroomIdAndDeckId(Long classroomId, Long deckId);
}
