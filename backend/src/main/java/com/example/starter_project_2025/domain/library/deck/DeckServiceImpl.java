package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.folder.Folder;
import com.example.starter_project_2025.domain.library.folder.FolderRepository;
import com.example.starter_project_2025.domain.library.tag.Tag;
import com.example.starter_project_2025.domain.library.tag.TagRepository;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
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
}
