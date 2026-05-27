package com.example.starter_project_2025.system.words.mean;

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

@ResourceMenu(title = "Nghĩa", group = "Tiếng Nhật", icon = "message-square", url = "/meanings", order = 3)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/meanings")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Meaning", description = "APIs for managing word meanings")
public class MeaningController
        extends BaseCrudDataIoController<Meaning, Long, MeaningDTO, MeaningFilter> {

    MeaningService meaningService;
    MeaningRepository meaningRepository;

    @Override
    protected BaseCrudService<Long, MeaningDTO, MeaningFilter> getService() {
        return meaningService;
    }

    @Override
    protected BaseCrudRepository<Meaning, Long> getRepository() {
        return meaningRepository;
    }

    @Override
    protected Class<Meaning> getEntityClass() {
        return Meaning.class;
    }
}