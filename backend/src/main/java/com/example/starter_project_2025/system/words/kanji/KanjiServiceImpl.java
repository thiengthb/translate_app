package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiServiceImpl
        extends BaseCrudServiceImpl<Kanji, Long, KanjiDTO, KanjiFilter>
        implements KanjiService {

    KanjiMapper kanjiMapper;
    KanjiRepository kanjiRepository;

    @Override
    protected BaseCrudRepository<Kanji, Long> getRepository() {
        return kanjiRepository;
    }

    @Override
    protected BaseCrudMapper<Kanji, KanjiDTO> getMapper() {
        return kanjiMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"character", "onyomi", "kunyomi", "meaning", "jlptLevel"};
    }

    @Override
    protected void beforeCreate(Kanji entity, KanjiDTO request, ValidationContext ctx) {
        if (request.getCharacter() != null && kanjiRepository.existsByCharacter(request.getCharacter())) {
            ctx.add("character", "Kanji character already exists");
        }
    }

    @Override
    protected void beforeUpdate(Kanji entity, KanjiDTO request, ValidationContext ctx) {
        if (request.getCharacter() != null
                && !request.getCharacter().equals(entity.getCharacter())
                && kanjiRepository.existsByCharacterAndIdNot(request.getCharacter(), entity.getId())) {
            ctx.add("character", "Kanji character already exists");
        }
    }
}