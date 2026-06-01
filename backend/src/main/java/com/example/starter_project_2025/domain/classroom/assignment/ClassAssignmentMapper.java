package com.example.starter_project_2025.domain.classroom.assignment;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface ClassAssignmentMapper extends BaseCrudMapper<ClassAssignment, ClassAssignmentDTO> {

    @Override
    @IgnoreAuditFields
    ClassAssignment toEntity(ClassAssignmentDTO dto);

    @Override
    ClassAssignmentDTO toResponse(ClassAssignment entity);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget ClassAssignment entity, ClassAssignmentDTO dto);
}
