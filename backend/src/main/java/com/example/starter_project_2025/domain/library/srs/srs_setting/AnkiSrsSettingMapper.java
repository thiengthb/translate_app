package com.example.starter_project_2025.domain.library.srs.srs_setting;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface AnkiSrsSettingMapper extends BaseCrudMapper<AnkiSrsSetting, AnkiSrsSettingDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "algorithmConfig", ignore = true)
    AnkiSrsSetting toEntity(AnkiSrsSettingDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "algorithmConfigId", source = "algorithmConfig.id")
    AnkiSrsSettingDTO toResponse(AnkiSrsSetting entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "algorithmConfig", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget AnkiSrsSetting entity, AnkiSrsSettingDTO dto);
}
