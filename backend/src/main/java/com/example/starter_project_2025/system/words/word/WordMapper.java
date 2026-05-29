package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.mean.MeaningMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class, uses = MeaningMapper.class)
public interface WordMapper extends BaseCrudMapper<Word, WordDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "representation.id", source = "representationId")
    @Mapping(target = "meanings", ignore = true)
    @Mapping(target = "level.id", source = "levelId")
    Word toEntity(WordDTO dto);

    @Override
    @Mapping(target = "representationId", source = "representation.id")
    @Mapping(target = "representationName", source = "representation.name")
    @Mapping(target = "meaningText", expression = "java(primaryMeaningText(entity.getMeanings()))")
    @Mapping(target = "meanings", source = "meanings")
    @Mapping(target = "levelId", source = "level.id")
    @Mapping(target = "levelName", source = "level.name")
    WordDTO toResponse(Word entity);

    /** Nghĩa hiển thị chính: ưu tiên tiếng Việt, ngược lại lấy nghĩa đầu tiên. */
    default String primaryMeaningText(List<Meaning> meanings) {
        if (meanings == null || meanings.isEmpty()) {
            return null;
        }
        return meanings.stream()
                .filter(m -> m.getLanguage() != null && m.getLanguage().getCode() != null
                        && ("vi".equalsIgnoreCase(m.getLanguage().getCode())
                            || "vie".equalsIgnoreCase(m.getLanguage().getCode())))
                .map(Meaning::getName)
                .findFirst()
                .orElse(meanings.get(0).getName());
    }
}