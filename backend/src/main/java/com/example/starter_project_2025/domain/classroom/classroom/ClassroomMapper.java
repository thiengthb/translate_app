package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface ClassroomMapper extends BaseCrudMapper<Classroom, ClassroomDTO> {

    @Override
    @IgnoreAuditFields
    Classroom toEntity(ClassroomDTO dto);

    @Override
    ClassroomDTO toResponse(Classroom entity);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Classroom entity, ClassroomDTO dto);
}
