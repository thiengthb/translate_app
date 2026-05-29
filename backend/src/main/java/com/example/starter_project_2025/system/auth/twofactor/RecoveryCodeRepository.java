package com.example.starter_project_2025.system.auth.twofactor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecoveryCodeRepository extends JpaRepository<RecoveryCode, Long> {

    Optional<RecoveryCode> findByUserIdAndCodeHashAndUsedFalse(Long userId, String codeHash);

    List<RecoveryCode> findAllByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM RecoveryCode r WHERE r.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);
}
