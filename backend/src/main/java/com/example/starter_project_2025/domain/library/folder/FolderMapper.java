package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface FolderMapper {

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    Folder toEntity(FolderDTO dto);

    @Mapping(target = "userId", source = "user.id")
    FolderDTO toResponse(Folder folder);

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Folder folder, FolderDTO dto);
}
