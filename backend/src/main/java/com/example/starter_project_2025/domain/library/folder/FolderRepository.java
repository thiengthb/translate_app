package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FolderRepository extends BaseCrudRepository<Folder, Long> {

    boolean existsByNameAndUserId(String name, Long userId);

    boolean existsByNameAndUserIdAndIdNot(String name, Long userId, Long id);
}
