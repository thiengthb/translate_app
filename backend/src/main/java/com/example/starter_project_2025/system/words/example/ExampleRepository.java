package com.example.starter_project_2025.system.words.example;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExampleRepository extends BaseCrudRepository<Example, Long> {
}