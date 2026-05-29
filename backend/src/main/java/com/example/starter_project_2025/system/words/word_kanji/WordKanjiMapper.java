package com.example.starter_project_2025.system.words.word_kanji;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface WordKanjiMapper extends BaseCrudMapper<WordKanji, WordKanjiDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "word.id", source = "wordId")
    @Mapping(target = "kanji.id", source = "kanjiId")
    WordKanji toEntity(WordKanjiDTO dto);

    @Override
    @Mapping(target = "wordId", source = "word.id")
    @Mapping(target = "kanjiId", source = "kanji.id")
    WordKanjiDTO toResponse(WordKanji entity);
}