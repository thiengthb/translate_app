package com.example.starter_project_2025.system.words.example;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@ResourceMenu(title = "Ví dụ", group = "Tiếng Nhật", icon = "file-text", url = "/examples", order = 8)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/examples")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Example", description = "APIs for managing word examples")
public class ExampleController
        extends BaseCrudDataIoController<Example, Long, ExampleDTO, ExampleFilter> {

    ExampleService exampleService;
    ExampleRepository exampleRepository;

    @Override
    protected BaseCrudService<Long, ExampleDTO, ExampleFilter> getService() {
        return exampleService;
    }

    @Override
    protected BaseCrudRepository<Example, Long> getRepository() {
        return exampleRepository;
    }

    @Override
    protected Class<Example> getEntityClass() {
        return Example.class;
    }
}