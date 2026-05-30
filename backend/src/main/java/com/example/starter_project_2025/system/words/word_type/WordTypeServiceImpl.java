package com.example.starter_project_2025.system.words.word_type;

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
public class WordTypeServiceImpl
        extends BaseCrudServiceImpl<WordType, Long, WordTypeDTO, WordTypeFilter>
        implements WordTypeService {

    WordTypeMapper wordTypeMapper;
    WordTypeRepository wordTypeRepository;

    @Override
    protected BaseCrudRepository<WordType, Long> getRepository() {
        return wordTypeRepository;
    }

    @Override
    protected BaseCrudMapper<WordType, WordTypeDTO> getMapper() {
        return wordTypeMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "code", "description"};
    }

    @Override
    protected void beforeCreate(WordType entity, WordTypeDTO request, ValidationContext ctx) {
        if (request.getCode() != null && wordTypeRepository.existsByCode(request.getCode())) {
            ctx.add("code", "Word type code already exists");
        }
    }

    @Override
    protected void beforeUpdate(WordType entity, WordTypeDTO request, ValidationContext ctx) {
        if (request.getCode() != null
                && !request.getCode().equals(entity.getCode())
                && wordTypeRepository.existsByCodeAndIdNot(request.getCode(), entity.getId())) {
            ctx.add("code", "Word type code already exists");
        }
    }
}
