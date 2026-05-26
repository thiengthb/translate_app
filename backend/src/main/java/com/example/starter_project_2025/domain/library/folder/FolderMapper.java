package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface FolderMapper extends BaseCrudMapper<Folder, FolderDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    Folder toEntity(FolderDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    FolderDTO toResponse(Folder folder);

    @Override
    @Mapping(target = "user", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Folder folder, FolderDTO dto);
}
