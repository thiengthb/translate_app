package com.example.starter_project_2025.domain.library.srs.srs_setting;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnkiSrsSettingRepository extends BaseCrudRepository<AnkiSrsSetting, Long> {

    boolean existsByUserId(Long userId);

    boolean existsByUserIdAndIdNot(Long userId, Long id);

    Optional<AnkiSrsSetting> findByUserId(Long userId);
}
