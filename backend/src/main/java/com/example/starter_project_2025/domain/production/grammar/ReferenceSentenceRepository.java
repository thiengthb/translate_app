package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReferenceSentenceRepository extends BaseCrudRepository<ReferenceSentence, Long> {

    List<ReferenceSentence> findBySubUseId(Long subUseId);
}
