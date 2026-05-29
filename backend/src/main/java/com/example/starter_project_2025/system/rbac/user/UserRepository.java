package com.example.starter_project_2025.system.rbac.user;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends BaseCrudRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Long countByIsActive(Boolean isActive);

    long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    List<User> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT FUNCTION('DATE', u.createdAt) AS d, COUNT(u) AS c " +
            "FROM User u WHERE u.createdAt >= :since " +
            "GROUP BY FUNCTION('DATE', u.createdAt) " +
            "ORDER BY FUNCTION('DATE', u.createdAt) ASC")
    List<Object[]> countDailyUsersSince(@Param("since") java.time.LocalDateTime since);
}
