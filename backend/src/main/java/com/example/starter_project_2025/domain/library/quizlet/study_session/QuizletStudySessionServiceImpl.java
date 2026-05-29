package com.example.starter_project_2025.domain.library.quizlet.study_session;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
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
public class QuizletStudySessionServiceImpl
        extends BaseCrudServiceImpl<QuizletStudySession, Long, QuizletStudySessionDTO, QuizletStudySessionFilter>
        implements QuizletStudySessionService {

    QuizletStudySessionMapper mapper;
    QuizletStudySessionRepository repository;
    UserRepository userRepository;
    DeckRepository deckRepository;

    @Override
    protected BaseCrudRepository<QuizletStudySession, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<QuizletStudySession, QuizletStudySessionDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(QuizletStudySession entity, QuizletStudySessionDTO request, ValidationContext ctx) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) { ctx.add("userId", "User not found"); return; }
        entity.setUser(user);

        Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) { ctx.add("deckId", "Deck not found"); return; }
        entity.setDeck(deck);
    }

    @Override
    protected void beforeUpdate(QuizletStudySession entity, QuizletStudySessionDTO request, ValidationContext ctx) {
        if (request.getDeckId() != null) {
            Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) { ctx.add("deckId", "Deck not found"); return; }
            entity.setDeck(deck);
        }
    }
}
