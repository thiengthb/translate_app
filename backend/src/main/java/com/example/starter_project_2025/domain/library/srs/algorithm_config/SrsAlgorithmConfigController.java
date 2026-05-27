package com.example.starter_project_2025.domain.library.srs.algorithm_config;

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
@RequestMapping("/api/anki/algorithm-configs")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "SrsAlgorithmConfig", description = "APIs for managing SRS algorithm configs")
public class SrsAlgorithmConfigController
        extends BaseCrudDataIoController<SrsAlgorithmConfig, Long, SrsAlgorithmConfigDTO, SrsAlgorithmConfigFilter> {

    SrsAlgorithmConfigService srsAlgorithmConfigService;
    SrsAlgorithmConfigRepository srsAlgorithmConfigRepository;

    @Override
    protected BaseCrudService<Long, SrsAlgorithmConfigDTO, SrsAlgorithmConfigFilter> getService() {
        return srsAlgorithmConfigService;
    }

    @Override
    protected BaseCrudRepository<SrsAlgorithmConfig, Long> getRepository() {
        return srsAlgorithmConfigRepository;
    }

    @Override
    protected Class<SrsAlgorithmConfig> getEntityClass() {
        return SrsAlgorithmConfig.class;
    }
}
