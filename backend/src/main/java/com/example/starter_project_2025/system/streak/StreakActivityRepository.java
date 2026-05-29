package com.example.starter_project_2025.system.streak;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StreakActivityRepository extends BaseCrudRepository<StreakActivity, Long> {

    boolean existsByUserIdAndActivityDate(Long userId, LocalDate date);

    List<StreakActivity> findByUserIdAndActivityDateBetweenOrderByActivityDateAsc(
            Long userId, LocalDate start, LocalDate end);
}
