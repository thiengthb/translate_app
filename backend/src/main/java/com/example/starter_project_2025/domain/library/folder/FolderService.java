package com.example.starter_project_2025.domain.library.folder;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FolderService {

    Page<FolderDTO> getAll(Pageable pageable, String search, FolderFilter filter);

    FolderDTO getById(Long id);

    FolderDTO create(FolderDTO request);

    FolderDTO update(Long id, FolderDTO request);

    void delete(Long id);
}
