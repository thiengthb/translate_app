package com.example.starter_project_2025.domain.library.tag;

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
@RequestMapping("/api/tags")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Tag", description = "APIs for managing user tags")
public class TagController
        extends BaseCrudDataIoController<com.example.starter_project_2025.domain.library.tag.Tag, Long, TagDTO, TagFilter> {

    TagService tagService;
    TagRepository tagRepository;

    @Override
    protected BaseCrudService<Long, TagDTO, TagFilter> getService() {
        return tagService;
    }

    @Override
    protected BaseCrudRepository<com.example.starter_project_2025.domain.library.tag.Tag, Long> getRepository() {
        return tagRepository;
    }

    @Override
    protected Class<com.example.starter_project_2025.domain.library.tag.Tag> getEntityClass() {
        return com.example.starter_project_2025.domain.library.tag.Tag.class;
    }
}
