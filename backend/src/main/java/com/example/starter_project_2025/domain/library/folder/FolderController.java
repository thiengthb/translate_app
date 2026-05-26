package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.crud.controller.BaseCrudController;
import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/folders")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Folder", description = "APIs for managing user folders")
public class FolderController
        extends BaseCrudDataIoController<Folder, Long, FolderDTO, FolderFilter> {

    FolderService folderService;
    FolderRepository folderRepository;

    @Override
    protected BaseCrudService<Long, FolderDTO, FolderFilter> getService() {
        return folderService;
    }

    @Override
    protected BaseCrudRepository<Folder, Long> getRepository() {
        return folderRepository;
    }

    @Override
    protected Class<Folder> getEntityClass() {
        return Folder.class;
    }
}
