package com.example.starter_project_2025.system.streak;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserStreakRepository extends BaseCrudRepository<UserStreak, Long> {

    Optional<UserStreak> findByUserId(Long userId);

    List<UserStreak> findAllByOrderByCurrentStreakDescLongestStreakDesc(Pageable pageable);
}
