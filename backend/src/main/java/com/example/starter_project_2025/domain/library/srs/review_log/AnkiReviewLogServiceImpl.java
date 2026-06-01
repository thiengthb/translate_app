package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.srs.review_session_item.AnkiReviewSessionItem;
import com.example.starter_project_2025.domain.library.srs.review_session_item.AnkiReviewSessionItemRepository;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgressRepository;
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
public class AnkiReviewLogServiceImpl
        extends BaseCrudServiceImpl<AnkiReviewLog, Long, AnkiReviewLogDTO, AnkiReviewLogFilter>
        implements AnkiReviewLogService {

    AnkiReviewLogMapper mapper;
    AnkiReviewLogRepository repository;
    UserRepository userRepository;
    AnkiSrsProgressRepository progressRepository;
    AnkiReviewSessionItemRepository sessionItemRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<AnkiReviewLog, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<AnkiReviewLog, AnkiReviewLogDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(AnkiReviewLog entity, AnkiReviewLogDTO request, ValidationContext ctx) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) { ctx.add("userId", "User not found"); return; }
        entity.setUser(user);

        AnkiSrsProgress progress = progressRepository.findById(request.getProgressId()).orElse(null);
        if (progress == null) { ctx.add("progressId", "Progress not found"); return; }
        entity.setProgress(progress);

        Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
        if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
        entity.setFlashcard(flashcard);

        if (request.getSessionItemId() != null) {
            AnkiReviewSessionItem sessionItem = sessionItemRepository.findById(request.getSessionItemId()).orElse(null);
            if (sessionItem == null) { ctx.add("sessionItemId", "Session item not found"); return; }
            entity.setSessionItem(sessionItem);
        }
    }

    @Override
    protected void beforeUpdate(AnkiReviewLog entity, AnkiReviewLogDTO request, ValidationContext ctx) {
    }
}
