package com.example.starter_project_2025.domain.library.srs.srs_setting;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfig;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfigRepository;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AnkiSrsSettingServiceImpl
        extends BaseCrudServiceImpl<AnkiSrsSetting, Long, AnkiSrsSettingDTO, AnkiSrsSettingFilter>
        implements AnkiSrsSettingService {

    AnkiSrsSettingMapper mapper;
    AnkiSrsSettingRepository repository;
    UserRepository userRepository;
    DeckRepository deckRepository;
    SrsAlgorithmConfigRepository algorithmConfigRepository;

    @Override
    protected BaseCrudRepository<AnkiSrsSetting, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<AnkiSrsSetting, AnkiSrsSettingDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(AnkiSrsSetting entity, AnkiSrsSettingDTO request, ValidationContext ctx) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) { ctx.add("userId", "User not found"); return; }
        entity.setUser(user);

        if (request.getDeckId() == null) { ctx.add("deckId", "Deck ID is required"); return; }
        Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) { ctx.add("deckId", "Deck not found"); return; }
        entity.setDeck(deck);

        if (repository.existsByUserIdAndDeckId(request.getUserId(), request.getDeckId())) {
            ctx.add("deckId", "Settings already exist for this deck");
            return;
        }

        if (request.getAlgorithmConfigId() != null && request.getAlgorithmConfigId() > 0) {
            SrsAlgorithmConfig config = algorithmConfigRepository.findById(request.getAlgorithmConfigId()).orElse(null);
            if (config == null) { ctx.add("algorithmConfigId", "Algorithm config not found"); return; }
            entity.setAlgorithmConfig(config);
        }
    }

    @Override
    protected void beforeUpdate(AnkiSrsSetting entity, AnkiSrsSettingDTO request, ValidationContext ctx) {
        if (request.getAlgorithmConfigId() != null) {
            if (request.getAlgorithmConfigId() <= 0) {
                entity.setAlgorithmConfig(null);
                return;
            }
            SrsAlgorithmConfig config = algorithmConfigRepository.findById(request.getAlgorithmConfigId()).orElse(null);
            if (config == null) { ctx.add("algorithmConfigId", "Algorithm config not found"); return; }
            entity.setAlgorithmConfig(config);
        }
    }
}
