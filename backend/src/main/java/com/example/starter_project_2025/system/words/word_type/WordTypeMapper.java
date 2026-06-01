package com.example.starter_project_2025.system.words.word_type;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface WordTypeMapper extends BaseCrudMapper<WordType, WordTypeDTO> {

    @Override
    @IgnoreAuditFields
    WordType toEntity(WordTypeDTO dto);
}
