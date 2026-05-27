package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.mean.MeaningRepository;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.representation.RepresentationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WordServiceImpl
        extends BaseCrudServiceImpl<Word, Long, WordDTO, WordFilter>
        implements WordService {

    WordMapper wordMapper;
    WordRepository wordRepository;
    RepresentationRepository representationRepository;
    MeaningRepository meaningRepository;
    LevelRepository levelRepository;

    @Override
    protected BaseCrudRepository<Word, Long> getRepository() {
        return wordRepository;
    }

    @Override
    protected BaseCrudMapper<Word, WordDTO> getMapper() {
        return wordMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"word", "reading", "wordType"};
    }

    @Override
    protected void beforeCreate(Word entity, WordDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    @Override
    protected void beforeUpdate(Word entity, WordDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    private void resolveRelations(Word entity, WordDTO request) {
        if (request.getRepresentationId() != null) {
            Representation representation = representationRepository.findById(request.getRepresentationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Representation not found"));
            entity.setRepresentation(representation);
        }
        if (request.getMeaningId() != null) {
            Meaning meaning = meaningRepository.findById(request.getMeaningId())
                    .orElseThrow(() -> new ResourceNotFoundException("Meaning not found"));
            entity.setMeaning(meaning);
        }
        if (request.getLevelId() != null) {
            Level level = levelRepository.findById(request.getLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Level not found"));
            entity.setLevel(level);
        }
    }
}