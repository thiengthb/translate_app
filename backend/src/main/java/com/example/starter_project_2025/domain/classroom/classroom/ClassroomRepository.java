package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassroomRepository extends BaseCrudRepository<Classroom, Long> {

    Optional<Classroom> findByInviteCode(String inviteCode);

    /**
     * Load a classroom row under a pessimistic write lock so concurrent joins
     * serialise on it — makes the member-count check-then-insert atomic and
     * prevents the roster from exceeding {@code maxMembers} under load.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Classroom c where c.id = :id")
    Optional<Classroom> findByIdForUpdate(@Param("id") Long id);

    boolean existsByInviteCode(String inviteCode);

    List<Classroom> findByOwnerIdAndIsDeletedFalse(Long ownerId);

    List<Classroom> findByVisibilityAndIsDeletedFalseOrderByCreatedAtDesc(String visibility);
}
