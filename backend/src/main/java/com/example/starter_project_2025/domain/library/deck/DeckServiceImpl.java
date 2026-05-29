package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSide;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSideContent;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardTemplateRepository;
import com.example.starter_project_2025.domain.library.folder.Folder;
import com.example.starter_project_2025.domain.library.folder.FolderRepository;
import com.example.starter_project_2025.domain.library.tag.Tag;
import com.example.starter_project_2025.domain.library.tag.TagRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DeckServiceImpl
        extends BaseCrudServiceImpl<Deck, Long, DeckDTO, DeckFilter>
        implements DeckService {

    DeckMapper deckMapper;
    DeckRepository deckRepository;
    UserRepository userRepository;
    FolderRepository folderRepository;
    TagRepository tagRepository;
    FlashcardTemplateRepository flashcardTemplateRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<Deck, Long> getRepository() {
        return deckRepository;
    }

    @Override
    protected BaseCrudMapper<Deck, DeckDTO> getMapper() {
        return deckMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"title", "description"};
    }

    @Override
    protected void beforeCreate(Deck deck, DeckDTO request, ValidationContext ctx) {

        Long userId = getCurrentUserId() != null ? getCurrentUserId() : request.getUserId();
        if (userId == null) {
            ctx.add("userId", "User not found");
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            ctx.add("userId", "User not found");
            return;
        }
        deck.setUser(user);

        if (request.getFolderId() != null) {
            Folder folder = folderRepository.findById(request.getFolderId()).orElse(null);
            if (folder == null) {
                ctx.add("folderId", "Folder not found");
                return;
            }
            deck.setFolder(folder);
        }

        if (request.getOriginalDeckId() != null) {
            Deck original = deckRepository.findById(request.getOriginalDeckId()).orElse(null);
            if (original == null) {
                ctx.add("originalDeckId", "Original deck not found");
                return;
            }
            deck.setOriginalDeck(original);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.getTagIds()));
            deck.setTags(tags);
        }

        if (deckRepository.existsByTitleAndUserId(request.getTitle(), user.getId())) {
            ctx.add("title", "Deck title already exists for this user");
        }
    }

    @Override
    protected void beforeUpdate(Deck deck, DeckDTO request, ValidationContext ctx) {

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId()).orElse(null);
            if (user == null) {
                ctx.add("userId", "User not found");
                return;
            }
            deck.setUser(user);
        }

        if (request.getFolderId() != null) {
            Folder folder = folderRepository.findById(request.getFolderId()).orElse(null);
            if (folder == null) {
                ctx.add("folderId", "Folder not found");
                return;
            }
            deck.setFolder(folder);
        }

        if (request.getOriginalDeckId() != null) {
            Deck original = deckRepository.findById(request.getOriginalDeckId()).orElse(null);
            if (original == null) {
                ctx.add("originalDeckId", "Original deck not found");
                return;
            }
            deck.setOriginalDeck(original);
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.getTagIds()));
            deck.getTags().clear();
            deck.getTags().addAll(tags);
        }

        if (request.getTitle() != null &&
                !request.getTitle().equals(deck.getTitle()) &&
                deckRepository.existsByTitleAndUserIdAndIdNot(
                        request.getTitle(), deck.getUser().getId(), deck.getId())) {
            ctx.add("title", "Deck title already exists for this user");
        }
    }

    /* ─────────────────────────────────────────
       Template wiring
    ───────────────────────────────────────── */

    @Override
    public DeckDTO applyTemplate(Long deckId, Long templateId) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new ResourceNotFoundException("Deck not found"));
        if (templateId == null) {
            throw new IllegalArgumentException("templateId is required");
        }
        if (!flashcardTemplateRepository.existsById(templateId)) {
            throw new ResourceNotFoundException("Template not found");
        }
        deck.setTemplateId(templateId);
        Deck saved = deckRepository.save(deck);
        return deckMapper.toResponse(saved);
    }

    @Override
    public DeckDTO removeTemplate(Long deckId) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new ResourceNotFoundException("Deck not found"));
        deck.setTemplateId(null);
        Deck saved = deckRepository.save(deck);
        return deckMapper.toResponse(saved);
    }

    /* ─────────────────────────────────────────
       Clone — copy a public deck into current user's library
    ───────────────────────────────────────── */
    @Override
    public DeckDTO cloneDeck(Long deckId) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Deck original = deckRepository.findById(deckId)
                .orElseThrow(() -> new ResourceNotFoundException("Source deck not found"));

        boolean isOwn = original.getUser() != null
                && original.getUser().getId() != null
                && original.getUser().getId().equals(userId);
        if (!isOwn && !"PUBLIC".equalsIgnoreCase(original.getVisibility())) {
            throw new AccessDeniedException("This deck is private and cannot be cloned");
        }

        // Keep the original title. Only append a numeric suffix when the user already
        // has another deck with the same title (the unique constraint forces this).
        String baseTitle = original.getTitle() != null ? original.getTitle() : "Untitled";
        String candidate = baseTitle;
        int suffix = 2;
        while (deckRepository.existsByTitleAndUserId(candidate, userId)) {
            candidate = baseTitle + " (" + suffix + ")";
            suffix++;
        }

        Deck cloned = Deck.builder()
                .user(user)
                .originalDeck(original)
                .title(candidate)
                .description(original.getDescription())
                .visibility("PRIVATE")
                .studyMode(original.getStudyMode() != null ? original.getStudyMode() : "QUIZLET")
                .coverImageUrl(original.getCoverImageUrl())
                .sourceLanguage(original.getSourceLanguage())
                .targetLanguage(original.getTargetLanguage())
                .templateId(original.getTemplateId())
                .totalCards(0)
                .build();
        Deck savedDeck = deckRepository.save(cloned);

        // Deep-clone every flashcard in the original deck
        List<DeckItem> originalItems = deckItemRepository.findByDeckIdOrderByOrderIndexAsc(deckId);
        int copied = 0;
        for (DeckItem item : originalItems) {
            Flashcard srcFc = item.getFlashcard();
            if (srcFc == null) continue;

            Flashcard fc = Flashcard.builder()
                    .wordId(srcFc.getWordId())
                    .cardType(srcFc.getCardType() != null ? srcFc.getCardType() : "BASIC")
                    .itemType(srcFc.getItemType() != null ? srcFc.getItemType() : "WORD")
                    .itemId(srcFc.getItemId() != null ? srcFc.getItemId() : 0L)
                    .front(srcFc.getFront() != null ? srcFc.getFront() : "")
                    .back(srcFc.getBack() != null ? srcFc.getBack() : "")
                    .hint(srcFc.getHint())
                    .explanation(srcFc.getExplanation())
                    .sides(new ArrayList<>())
                    .build();

            if (srcFc.getSides() != null) {
                for (FlashcardSide srcSide : srcFc.getSides()) {
                    FlashcardSide newSide = FlashcardSide.builder()
                            .flashcard(fc)
                            .side(srcSide.getSide())
                            .contents(new ArrayList<>())
                            .build();

                    if (srcSide.getContents() != null) {
                        for (FlashcardSideContent srcContent : srcSide.getContents()) {
                            if (Boolean.TRUE.equals(srcContent.getIsDeleted())) continue;
                            FlashcardSideContent newContent = FlashcardSideContent.builder()
                                    .side(newSide)
                                    .label(srcContent.getLabel())
                                    .contentType(srcContent.getContentType())
                                    .contentValue(srcContent.getContentValue())
                                    .orderIndex(srcContent.getOrderIndex())
                                    .metadata(srcContent.getMetadata() != null
                                            ? new HashMap<>(srcContent.getMetadata()) : null)
                                    .build();
                            newSide.getContents().add(newContent);
                        }
                    }
                    fc.getSides().add(newSide);
                }
            }

            Flashcard savedFc = flashcardRepository.save(fc);

            DeckItem newItem = DeckItem.builder()
                    .deck(savedDeck)
                    .flashcard(savedFc)
                    .orderIndex(item.getOrderIndex())
                    .build();
            deckItemRepository.save(newItem);
            copied++;
        }

        savedDeck.setTotalCards(copied);
        savedDeck = deckRepository.save(savedDeck);

        // Bump the source deck's clone counter for community sort/ranking
        original.setCloneCount(original.getCloneCount() + 1);
        deckRepository.save(original);

        return deckMapper.toResponse(savedDeck);
    }

    /* ─────────────────────────────────────────
       View counter — called when a user opens the preview page
    ───────────────────────────────────────── */
    @Override
    public void incrementView(Long deckId) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new ResourceNotFoundException("Deck not found"));
        deck.setViewCount(deck.getViewCount() + 1);
        deckRepository.save(deck);
    }
}
