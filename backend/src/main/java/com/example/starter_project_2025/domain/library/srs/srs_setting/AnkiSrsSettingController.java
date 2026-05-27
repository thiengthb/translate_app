package com.example.starter_project_2025.domain.library.srs.srs_setting;

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
@RequestMapping("/api/anki/settings")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiSrsSetting", description = "APIs for managing per-user Anki SRS settings")
public class AnkiSrsSettingController
        extends BaseCrudDataIoController<AnkiSrsSetting, Long, AnkiSrsSettingDTO, AnkiSrsSettingFilter> {

    AnkiSrsSettingService ankiSrsSettingService;
    AnkiSrsSettingRepository ankiSrsSettingRepository;

    @Override
    protected BaseCrudService<Long, AnkiSrsSettingDTO, AnkiSrsSettingFilter> getService() {
        return ankiSrsSettingService;
    }

    @Override
    protected BaseCrudRepository<AnkiSrsSetting, Long> getRepository() {
        return ankiSrsSettingRepository;
    }

    @Override
    protected Class<AnkiSrsSetting> getEntityClass() {
        return AnkiSrsSetting.class;
    }
}
