package com.example.starter_project_2025.domain.library.tag;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface TagMapper extends BaseCrudMapper<Tag, TagDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    Tag toEntity(TagDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    TagDTO toResponse(Tag tag);

    @Override
    @Mapping(target = "user", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Tag tag, TagDTO dto);
}
