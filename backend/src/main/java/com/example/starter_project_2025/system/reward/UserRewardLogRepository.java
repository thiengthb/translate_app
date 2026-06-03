package com.example.starter_project_2025.system.reward;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;

import java.util.List;

public interface UserRewardLogRepository
        extends BaseCrudRepository<UserRewardLog, Long> {

    boolean existsByUserIdAndSourceTypeAndSourceId(
            Long userId, String sourceType, Long sourceId);

    List<UserRewardLog> findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(
            Long userId);
}
