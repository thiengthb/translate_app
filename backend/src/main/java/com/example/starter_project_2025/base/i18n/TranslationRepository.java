package com.example.starter_project_2025.base.i18n;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TranslationRepository extends JpaRepository<Translation, Long> {

    List<Translation> findByLocale(String locale);

    List<Translation> findByLocaleAndCategory(String locale, String category);

    Optional<Translation> findByLocaleAndMessageKey(String locale, String messageKey);
}
