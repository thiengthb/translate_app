package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassroomRepository extends BaseCrudRepository<Classroom, Long> {

    Optional<Classroom> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    List<Classroom> findByOwnerIdAndIsDeletedFalse(Long ownerId);
}
